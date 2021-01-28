function trimPassword(user){
    if(user.password)//if the user object contains the password field,remove that field...
        user.password = undefined
    return user    
}
module.exports = trimPassword