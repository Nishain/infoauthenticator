const fs = require('fs')
var database
const fileName = './database.json'
const dbFunctions = {
 initDatabase : function(){
    
    var content = fs.existsSync(fileName)?fs.readFileSync(fileName,{encoding:'utf8'}):''
    if(content.length==0)
        content = '[]'
    database = JSON.parse(content)
    return database
},

updateSingleUser : function (user){
    const updatingIndex = this.searchIndexOfUser(user)
    if(updatingIndex==-1)
        return 'error'
    database[updatingIndex] = user 
    this.commitToDatabse()
},
commitToDatabse :  function(){
    fs.writeFile(fileName,JSON.stringify(database,null, 2),'utf8',()=>{
        console.log('database file updated')
    })
},
createUser : function(user){
    database.push(user)
    this.commitToDatabse()
},
deleteUser : function(user){
    const deletingIndex = this.searchIndexOfUser(user)
    if(deletingIndex==-1)
        return 'error'
    database.splice(deletingIndex,1)
    this.commitToDatabse()
},
searchIndexOfUser: function(user){
    return database.findIndex(u=>u.username==user.username && u.password==user.password)
},
isUsernameExist: function(username){
    return database.findIndex(u=>u.username==username)>-1?true:false
}
}

module.exports = dbFunctions
