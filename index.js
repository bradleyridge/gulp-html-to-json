'use strict'
const through2 = require('through2');
const replaceExt = require('replace-ext');
const fs = require('fs');
const util = require('util');


module.exports = () => {
    return through2.obj((file, enc, cb) => {
        if (file.isNull()) return cb(null, file);
        if (file.isStream()) return cb(new PluginError('[docx-html-converter]: ', 'Stream is not supported'));
        
        // get file
        var htmlInput = file.contents + '</html>';
            

        var wrapperObject = {
            openingTag : "html",
            content : [],
            closingTag : "html"
        };
        
        getContent(htmlInput, wrapperObject);

        var jsonOutput = JSON.stringify(wrapperObject);
        
        file.contents = new Buffer(jsonOutput);
        file.path = replaceExt(file.path, '.json');
            
        cb(null, file);
    });
};


function getChild(input){
    
    //get the opening tag
    var openingTagEndingIndex = input.indexOf('>');
    var openingTag = input.substring(1, openingTagEndingIndex);
    
    //get the closing tag from the opening tag
    var closingTag = openingTag;
    if (closingTag.indexOf(' ') > -1){
        var endingIndex = closingTag.indexOf(' ');
        closingTag = closingTag.substring(0, endingIndex);
    }
    
    //build the child object
    var child = {
        openingTag : openingTag,
        closingTag : closingTag,
        content : []
    };
    
    //consume the opening tag
    input = input.substring(openingTagEndingIndex + 1);
    
    //get the content between the opening and closing tags
    getContent(input, child);
    
    //consume the child's content
    var childContentSize = getContentSize(child.content, 0);
    input = input.substring(childContentSize);
         
    //return the child
    return child;
}


function getContent(input, parent){
    var index = 0;
    
    //get the next character
    var char = input.charAt(index);
    
    //if it is a tag
    if (char == '<'){
        
        //if it is a closing tag
        if (input.charAt(1) == '/'){

            return;
        } 
        
        //if it is an opening tag
        else {
            
            //get the child
            var child = getChild(input);
            parent.content.push(child);
            
            //get the child size
            var childSize = getChildSize(child);
            
            //consume the child
//TODO - get child size
            input = input.substring(childSize);
        }
    } 
    
    //if it is not a tag, it must be a string/character
    else {
        //if no children exist
        if (parent.content.length === 0 ){
            //create a new child/content string
            parent.content.push(char);
        } 
        //if children exist, and the last child is a string
        else if (typeof parent.content[parent.content.length - 1] === 'string'){
            
            //add this character to the existing string
            var existingString = parent.content[parent.content.length - 1];
            existingString += char;
            parent.content[parent.content.length - 1] = existingString;
        } 
        
        //if children exist, but the last child is not a string,
        else {
            //create a new child/content string
            parent.content.push(char);
        } 
        
        //consume the character
        input = input.substring(1);
    }
    
    //continue looking for children or strings until the closing tag is reached
    getContent(input, parent);
}





function getChildSize(parent){
    var size = parent.openingTag.length + 2;
    size += parent.closingTag.length + 3;
   
    var contentSize = getContentSize(parent.content, 0);
    size += contentSize;
    
    return size;
}
function getContentSize(content, index){
    var size = 0;
    if (content.length > index){
        if (typeof content[index] === 'string'){
            size += content[index].length;
        } else {
            size += getChildSize(content[index]);
        }
    } else {
        return 0;
    }
    return size +  getContentSize(content, index + 1);
}

