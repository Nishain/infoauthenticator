const app = require('express').Router()
const md5 = require('md5')
const database = require('./databaseFile')
const showError = require('./showError')
const trimPassword = require('./trimPassword')
//updating a user
app.put('/users/',(req,res)=>{
    const updatedUser = req.currentUser
    for(property in req.body){
        if(property.startsWith('_'))
            return res.send(showError("cannot start a field with _"))
        updatedUser[property] = req.body[property]
    }
    if(Object.keys(req.body).length==0)//check if the body is empty...
        return res.send(showError('nothing to update.No fields specified'))
    //check if the user has updated his password if so then hash the new password
    if(req.body.password){
        if(typeof req.body.password=='string')
            updatedUser.password = md5(req.body.password)
         else
            return res.send(showError('password field should be a string'))       
    }
    //update the database, return error if user not exist
    if(database.updateSingleUser(updatedUser)=='error')
        return res.send(showError('system error - updating user does not exist'))
    res.send(trimPassword(updatedUser))
})

//deleting the user
app.delete('/users/',(req,res)=>{
    const deletingUser = req.currentUser
    if(deletingUser.username)
        database.deleteUser(deletingUser)
    res.send(trimPassword(deletingUser))
})
module.exports = app