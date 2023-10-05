import express from 'express'
import mysql from 'mysql2/promise'
import cors from 'cors'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'



const app = express()
app.use(cors())
app.use(express.json())


const db = mysql.createPool({
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
                const userdetails={
                    username:payload.username,
                    user_id:payload.user_id
                }
                req.userdetails=userdetails
                next()

            }


        })
    }

}


app.get('/',logger, async(req, res) => {
    try{
        const { orderby = "idproducts", order = "ASC" } = req.query
        const sql = `select * from products order by ${orderby} ${order}`;
        const result=await db.execute(sql)

        res.send(result[0])


    }catch(error){
        res.status(500).send({ message: "Error inside the server" });
    }
    
    

})

app.get('/user',logger,(req,res)=>{    
    res.send(req.userdetails)
})



app.delete('/products/:productId', async(req, res) => {
    const { productId } = req.params
    const sql = `delete from products where idproducts=${productId}`
    try{
        const query=db.execute(sql)
        
    }catch(error){
        res.status(500).send({ message: "Error inside the server" });

    }
})

app.post('/products', (req, res) => {
    const { productname, productprice } = req.body
    const productprices = parseInt(productprice)
    try{
        const sql = `INSERT INTO products (name,price) VALUES ('${productname}',${productprices})`
        const result=db.execute(sql)
        res.send(result)


    }catch(error){
        res.status(500).send({ message: "Error inside the server" });

    }

    
    
})
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const [rows] = await db.execute(`SELECT * FROM users WHERE username=?`, [username]);
  
      if (rows.length === 0) {
        return res.status(401).send({ message: "Invalid username" });
      }
  
      const userdetails = rows[0];
      const isPasswordMatched = await bcrypt.compare(password, userdetails.password);
  
      if (isPasswordMatched) {
        const payload = { username: username, user_id: userdetails.id };
        const jwtToken = jwt.sign(payload, "helloworld");
        res.send({ jwtToken });
      } else {
        res.status(400).json({ message: "Invalid criteria" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: "Error inside the server" });
    }
  });

  app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const hashedpassword = await bcrypt.hash(password, 10);
  
      // Check if username already exists
      const [rows] = await db.execute(`SELECT * FROM users WHERE username=?`, [username]);
  
      if (rows.length !== 0) {
        return res.status(400).send({ message: "Username already exists" });
      }
  
      // Insert new user
      const [result] = await db.execute(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashedpassword]);
      const userId = result.insertId;
  
      // Insert cart entry for the new user
      await db.execute(`INSERT INTO cart (user_id) VALUES (?)`, [userId]);
  
      res.send({ message: 'User registered successfully', userId });
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: "Error inside the server" });
    }
  });



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
app.post('/:userId',async(req,res)=>{
    const{idproducts,name,price}=req.body
    const { userId } = req.params
    const sql=`SELECT * from cart WHERE user_id=${userId}`
    try{
        const [cartdetails]=await db.execute(sql)
        const cart_id=cartdetails[0].idcart
        try{
            const sql2='INSERT INTO cartproduct (product_name,product_price,product_id,cart_id) VALUES(?,?,?,?)'
            const values=[name,price,idproducts,cart_id]
            const result= await db.execute(sql2,values)
            try{
                const [selectquery]=await db.execute('select sum(product_price) as total from cartproduct where cart_id=?',[cart_id])
                const total=selectquery[0].total
                try{
                    const finalresult=await db.execute('UPDATE cart SET total=? WHERE user_id=?',[total,userId])
                    res.send(result)
                }catch(error){
                    res.status(500).send({ message: "Error inside the server at updating of total" });

                }

            }catch(error){
                res.status(500).send({ message: "Error inside the server at insert of total" });

            }

        }catch(error){
            res.status(500).send({ message: "Error inside the server at cartproduct insertion" });

        }
        

    }catch(error){
        res.status(500).send({ message: "Error inside the server" });


    }
    
    
    
    
    
    


    
})



app.listen(5000, () => {
    console.log("listening")
})