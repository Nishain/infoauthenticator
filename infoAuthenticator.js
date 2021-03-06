const express = require('express')
const app = express()
const trimPassword = require('./trimPassword')
const showError = require('./showError')
//const port = process.env.port || 4000
const database = require('./databaseFile')
const md5 = require('md5')
const data = database.initDatabase()
var currentUser = {}
app.use(express.json())
function authenticate(req,res,next){
    if(req.method == 'POST' && req.path.startsWith('/users'))
        return next()
    const username = req.headers.username
    const password = req.headers.password
    if(!(username && password))
        return res.send(showError('should include password and username in headers'))
    user = authorize(username,md5(password))
    if(!user)
        return res.send({errorCode:'unauthorized'})
     currentUser = user   
     req.currentUser = currentUser
     next()   
}
app.use(authenticate)
app.get('/users/:options?',(req,res)=>{
    const username = req.headers.username
    res.send(trimPassword(getData(username,req.params.options=="showArchitecture")))
})
app.post('/users',(req,res)=>{
    const newUser = {}
    if(!(typeof req.body.username == 'string' && typeof req.body.password == 'string'))
        return res.send(showError("should contain both 'password' and 'username'"))
    const newUserName = req.body.username    
    if(database.isUsernameExist(newUserName))
        return (res.send(showError(`user with username ${newUserName} already exist`)))
    for(property in req.body){
        if(property.startsWith('_'))
            return res.send(showError("cannot start a field with _"))
        newUser[property] = req.body[property]
    }
    if(Object.keys(newUser).length<3)
        return res.send(showError("You haven't specified any fields nothing to create!"))
    newUser.password = md5(newUser.password)
    newUser._meta={}
    database.createUser(newUser)
    res.send(trimPassword(newUser))
})

app.get('/access',(req,res)=>{
    if(currentUser._meta.type==1)
        res.send(getCompanions())
    else 
        res.send(getAccessFields())
})
const adminFunctions = require('./adminFunctions')
app.use('/admin/',adminFunctions)
app.use((req,res)=>{
    res.send(showError("Sorry your request doesn't matched any route"))
})
function getCompanions(){  
    //if the user doesn't have any subuser then return empty array
    if(!currentUser._meta.subUsers || currentUser._meta.subUsers.length==0)
        return[]    
    return user._meta.subUsers.map(friend=>{
            //send a list custom list of sub-users
            return {
            name:friend.name,
            accessFields:friend.fields
        }
    })    

}

function authorize(username,password){
    const user = data.find(u=>u.username==username)
    if(!user){
        return false //if username doesn't exist fail authentication
    }
     else if (user.password==password){//check if user is the primary user
        user._meta.type = 1
        return user   
     }
     else if(user._meta.subUsers //check if logged user is secondary user
        && (subUser = user._meta.subUsers.find(pass=>pass.password==password))){
            subUser._meta = {
                type : 2
            }
            return subUser
    }
}  

function getAccessFields(){
    //return name of sub-user and list of acessible fields for sub user
    return {
        name:currentUser.name,
        fields:currentUser.fields
    }
}
function getData(username,showArchitecture){
    var result={}
    if(currentUser._meta.type==1){
        for (const key in user) {
            //skip _meta field
            if(key=='_meta')
                continue
            //check if the field is referencing to another user    
            //or just add the field to result object
            result[key] = user[key]
            if(!showArchitecture)
                    result[key] = replaceReferencesWithValues(user[key],username)
        }   
        return result
    } 
    //if not a primary/admin user then check if the password is from companion sub-user
    else if(user._meta.type==2){
            //iterates through list field names the companion user suppose to access
            const user = data.find(u=>u.username==username)
            for(field of currentUser.fields){
            //check if the field is referencing to another user 
                result[field] = user[field]==undefined?showError('user doesn\'t have such field'):user[field]
                if(!showArchitecture)
                    result[field] = replaceReferencesWithValues(result[field],username)
                console.log(result[field])    
        }
        return result
    }
    
}
function replaceReferencesWithValues(value,accOwner){
    if(typeof value == 'string'){
        if(/\${.+}\.\w+$/.test(value))
            value = getSharedInformation(value,accOwner)    
    }
    else if(typeof value == 'object'){
        for (const key in value) {           
            value[key] = replaceReferencesWithValues(value[key],accOwner)
        }
    }else if(Array.isArray(value)){
        value.map(v=>{
            replaceReferencesWithValues(v,accOwner)
        })
    }
    return value
}
function getSharedInformation(value,accOwner){
    //extracting the username of the referencing user...
    //refrencing format style - ${username}.fieldName

    let foreignUsername = value.substring(value.indexOf('{')+1,value.lastIndexOf('}'))   
    //extract the field name user want to access
    let field = value.substring(value.lastIndexOf('.')+1)
    let user = data.find(user=>user.username==foreignUsername)
    //check if such referencing user exist 
    if(!user)
        return showError('cannot find reference user')

    if(user._meta.shareInfomation){//check if user setup sharing information
        const sharedUser = user._meta.shareInfomation.find(u=>u.username==accOwner)
        if(sharedUser){
            if(sharedUser.fields.find(f=>f==field)){//check if user is privilenges to access to particular field
                if(typeof user[field]=='string' && /\${.+}\.\w+$/.test(user[field]))
                    //user is prohibited to perform secondary referencing as this can leads to cycling infinte referencing
                    //and for privacy reasons...
                    return showError("Unsupported operation.This field referencing another user.Therefore this is secondary referencing")
                return user[field]            
             }
             else
                return showError("you have access privileges to the field or such field doesn't exist")
        }else
            return showError("user didn't added you for sharing")
        

    }else
        return showError('user didn\'t setup sharing yet')    
}

function start(port){
    app.listen(port,()=>{
        console.log('infoAuthenticator server started on '+port)
    })
}
start(3000)
module.exports.server = app
module.exports.start = start

