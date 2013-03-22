/***
*
* Responsible for negotiating messages between two clients
*
****/

var authorManager = require("../../src/node/db/AuthorManager"),
padMessageHandler = require("../../src/node/handler/PadMessageHandler"),
            async = require('../../src/node_modules/async');

/* 
* Handle incoming messages from clients
*/
exports.handleMessage = function(hook_name, context, callback){
  // Firstly ignore any request that aren't about RTC
  var isRtcMessage = false;
  if(context){
    if(context.message && context.message){
      if(context.message.type === 'COLLABROOM'){
        if(context.message.data){ 
          if(context.message.data.type){
            if(context.message.data.type === 'RTC'){
              isRtcMessage = true;
            } 
          }
        }
      }
    }
  }
  if(!isRtcMessage){
    callback(false);
    return false;
  }

  var message = context.message.data;
  /***
    What's available in a message?
     * action -- The action IE request, accept
     * padId -- The padId of the pad both authors are on
     * targetAuthorId -- The Id of the author this user wants to talk to
     * myAuthorId -- The Id of the author who is trying to talk to the targetAuthorId
  ***/
  if(message.action === 'requestRTC'){
      authorManager.getAuthorName(message.myAuthorId, function(er, authorName){ // Get the authorname

        var msg = {
          type: "COLLABROOM",
          data: { 
            type: "CUSTOM",
            payload: {
              action: "requestRTC",
              authorId: message.myAuthorId,
              targetAuthorId: message.targetAuthorId,
              authorName: authorName,
              padId: message.padId
            }
          }
        };
        sendToTarget(message, msg);
      });
    }

    if(message.action === 'declineRTC'){ // User has approved the invite to create a peer connection
      var message = context.message.data;
      console.warn("DECLINING");
      var msg = {
        type: "COLLABROOM",
        data: {
          type: "CUSTOM",
          payload: {
            action: "declineRTC",
            authorId: message.myAuthorId,
            targetAuthorId: message.targetAuthorId,
            padId: message.padId
          }
        }
      };
      sendToTarget(message, msg);
    }

  if(isRtcMessage === true){
    callback([null]);
  }else{
    callback(true);
  }
}


function sendToTarget(message, msg){
  var sessions = padMessageHandler.sessioninfos;
  // TODO: Optimize me
  Object.keys(sessions).forEach(function(key){
    var session = sessions[key]
    if(session.author == message.targetAuthorId){
      padMessageHandler.handleCustomObjectMessage(msg, key, function(){
      // TODO: Error handling
      }); // Send a message to this session
    }
  });
}
