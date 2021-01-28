function showError(err){
    //if an error occurred return error object...
    return {error:true,msg:err}
}
module.exports = showError