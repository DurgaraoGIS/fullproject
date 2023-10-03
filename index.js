import express from 'express'
import mysql from 'mysql'
import cors from 'cors'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'



const app = express()
app.use(cors())
app.use(express.json())


const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Root@123",
    database: "products_db"
})

const logger = (req, res, next) => {
    let jwtToken
    const authHeader = req.headers["authorization"]

    if (authHeader !== undefined) {
        jwtToken = authHeader.split(" ")[1]
    }
    if (jwtToken === undefined) {
        res.status(401).send("Invalid Access Token");

    }
    else {
        jwt.verify(jwtToken, "helloworld", async (err, payload) => {
            if (err) {
                res.send(err)

            }
            else {
                req.username=payload.username
                next()

            }


        })
    }

}


app.get('/',logger, (req, res) => {
    const { orderby = "idproducts", order = "ASC" } = req.query
    const sql = `select * from products order by ${orderby} ${order}`;
    db.query(sql, (errror, result) => {
        if (errror) {
            res.status(500).json({ message: "Error inside server" });

        }
        else {
            res.send(result);

        }

    })

})

app.get('/user',logger,(req,res)=>{
    let {username}=req
    res.send(username)
})



app.delete('/products/:productId', (req, res) => {
    const { productId } = req.params
    const sql = `delete from products where idproducts=${productId}`
    db.query(sql, (err, result) => {
        if (err) return res.send({ message: "error while deleting " })
        return res.send(result)
    })
})

app.post('/products', (req, res) => {
    const { productname, productprice } = req.body
    const productprices = parseInt(productprice)

    const sql = `INSERT INTO products (name,price) VALUES ('${productname}',${productprices})`
    db.query(sql, (err, result) => {
        if (err) return res.send({ message: 'eror' })
        return res.send(result)
    })
})
app.post('/login', async (req, res) => {
    const { username, password } = req.body
    const sql = `select * from users where username='${username}'`

    db.query(sql, async (err, result) => {
        if (err) return res.send({ message: 'error' })
        if (result.length === 0) {
            return res.status(401).send({ message: "Invalid username" })
        }
        const userdetails = result[0]
        const ispasswordmatched = await bcrypt.compare(password, userdetails.password)
        if (ispasswordmatched === true) {
            const payload = { username: username }
            const jwtToken = jwt.sign(payload, "helloworld");
            res.send({ jwtToken })
        }
        else {
            res.status(400).json({ message: "Invalid creiteria" })

        }


    })
})

app.post('/signup', async (req, res) => {
    const { username, password } = req.body
    const hashedpassword = await bcrypt.hash(password, 10)
    const sql = `select * from users where username='${username}'`
    db.query(sql, async (err, result) => {
        if (err) return res.send({ message: "error at inside the server" })
        if (result.length !== 0) {
            return res.status(400).send({ message: "username already exists" })
        }
        db.query(`INSERT INTO users (username,password) VALUES ('${username}','${hashedpassword}')`, (error, finalresult) => {
            if (error) return res.status(400).send({ message: error })
            return res.send(finalresult)
        })


    })


})



app.put('/products/:productId', (req, res) => {
    const { productname, productprice } = req.body
    const productprices = parseInt(productprice)
    const { productId } = req.params


    const sql = `update products set name='${productname}',price=${productprices} where idproducts=${productId}`
    db.query(sql, (err, result) => {
        if (err) return res.send({ message: "error" })
        return res.send(result)
    })

})


app.listen(5000, () => {
    console.log("listening")
})