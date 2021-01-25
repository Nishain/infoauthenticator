const md5 = require('md5')
const database = require('./databaseFile')
var currentUser
const app = require('express').Router()
const users = require('./user')

//check and validating the entry point to 'admin' endpoint
app.use('/',(req,res,next)=>{
    currentUser = req.currentUser
    if(currentUser._meta.type==2){//secure this endpoint to be used against subusers/collabarate users..
        return res.send('only admin users can use this endpoint')
    }
    //the fields property mandatory to be an array..
    if(req.body.fields && !Array.isArray(req.body.fields))
        return res.send("'field' should be an array property.Please check your JSON body")
    next()
})


app.use(users)//route the request which goes with endpoint '/users'

//granting access to new sub user to given username
app.post('/access',(req,res)=>{
    var newAccess = {
        name:req.body.name,
        password:md5(req.body.password),
        fields:req.body.fields
    }
    if(currentUser._meta.subUsers){
        //the new user's password or name cannot be conflicted with other users...
        if(currentUser._meta.subUsers.find(s=>s.name==newAccess.name || s.password==newAccess.password))
            return res.send('a sub-user already exist with same name or password')
        currentUser._meta.subUsers.push(newAccess)
    }else//for first time setting the new user
        currentUser._meta.subUsers = [newAccess]
    res.send(newAccess)
    database.updateSingleUser(currentUser)
})

//deleting the given sub user by name
app.delete('/access/:name',(req,res)=>{
    const deleteIndex = currentUser._meta.subUsers.findIndex(u=>u.name==req.params.name)
    if(deleteIndex==-1)
        return res.send('removing user does not exist')
    res.send(currentUser._meta.subUsers.splice(deleteIndex,1)[0])
    database.updateSingleUser(currentUser)
})

//updating the accessible fields for sub-user
app.put('/access/:name',(req,res)=>{ 
    const updateUser = currentUser._meta.subUsers.find(u=>u.name==req.params.name)
    if(!updateUser)
        return res.send('updating user does not exist')
    updateUser.fields = req.body.fields
    res.send(updateUser)
    database.updateSingleUser(currentUser)
})

//view shared data fields with shared users
app.get('/share',(req,res)=>{
    if(!currentUser._meta.shareInfomation)
        return res.send('you have not setup sharing yet')
    res.send(currentUser._meta.shareInfomation)
})

//setting up a share access for new user..
app.post('/share',(req,res)=>{
    const shareUser = {
        username:req.body.username,
        fields:req.body.fields
    }
    if(currentUser._meta.shareInfomation){   
        if(currentUser._meta.shareInfomation.find(s=>s.username==shareUser.username))
            return res.send('you are already sharing with this user')
        currentUser._meta.shareInfomation.push(shareUser)
    }
    else    
        currentUser._meta.shareInfomation = [shareUser]
    res.send(shareUser)  
    database.updateSingleUser(currentUser)
})

//edit the list of shared fields for specific user...
app.put('/share/:username',(req,res)=>{
    const updatingShareUser = currentUser._meta.shareInfomation.find(u=>u.name==req.params.name)
    if(!updatingShareUser)
        return res.send('updating entity does not exist')
    updatingShareUser.fields = req.body.fields
    res.send(updatingShareUser)
    database.updateSingleUser(currentUser)
})

//revoke permission of user to access information
app.delete('/share/:username',(req,res)=>{
    const paramUsername = req.params.username
    const removingIndex = currentUser._meta.shareInfomation.findIndex(u=>u.username==paramUsername)
    if(removingIndex==-1)
        return res.send('username to be purged does not exist in share list')
    else 
        res.send(currentUser._meta.shareInfomation.splice(removingIndex,1)[0])  
        database.updateSingleUser(currentUser)  
})
module.exports = app