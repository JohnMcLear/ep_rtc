/***
*
* Responsible for negotiating messages between clients to create peer connections
*
****/

var authorManager = require("../../src/node/db/AuthorManager"),
padMessageHandler = require("../../src/node/handler/PadMessageHandler"),
            async = require('../../src/node_modules/async'),
   sessionManager = require("../../src/node/db/SessionManager");

// var socketio = padMessageHandler.setSocketIO; // I really don't want this here but oh well..

/* 
* Handle incoming messages from clients
*/
exports.handleMessage = function(hook_name, context, callback){
  // Firstly ignore any request that aren't about RTC
  var isRtcMessage = false;
  if(context.message.type === 'COLLABROOM'){
    if(context.message.data.type === 'RTC'){
      isRtcMessage = true;
    } 
  }
  if(isRtcMessage){

    var message = context.message.data;
    /***
      What's available in a message?
       * action -- The action IE request, accept... TODO
       * padId -- The padId of the pad both authors are on
       * targetAuthorId -- The Id of the author this user wants to talk to
       * myAuthorId -- The Id of the author who is trying to talk to the targetAuthorId
    ***/
    if(message.action === 'request'){
      authorManager.getAuthorName(message.myAuthorId, function(er, authorName){ // Get the authorname

        var msg = {
          type: "COLLABROOM",
          data: {
            type: "CUSTOM",
            action: "requestRTC",
            authorId: message.myAuthorId,
            targetAuthorId: message.targetAuthorId,
            authorName: authorName,
            padId: message.padId
          }
        };
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
 
      });
    }

    if(message.action === 'approveRTC'){ // User has approved the invite to create a peer connection
      var message = context.message.data;
       
      var msg = {
        type: "COLLABROOM",
        data: {
          type: "CUSTOM",
          action: "approveRTC",
          authorId: message.myAuthorId,
          targetAuthorId: message.targetAuthorId
        }
      };
 
      sessionManager.listSessionsOfAuthor(message.targetAuthorID, function(er, sessionID){ // Get the session ID of the author 
        padMessageHandler.handleCustomObjectMessage(msg, sessionID);
      });

    }

    if(message.action === 'denyRTC'){ // User has approved the invite to create a peer connection
      var message = context.message.data;

      var msg = {
        type: "COLLABROOM",
        data: {
          type: "CUSTOM",
          action: "denyRTC",
          authorId: message.myAuthorId,
          targetAuthorId: message.targetAuthorId 
        }
      };

    }



  }
  if(isRtcMessage === true){
    callback([null]);
  }else{
    callback(true);
  }
}

