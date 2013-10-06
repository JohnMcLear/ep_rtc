/****
*
* Handled by the client - Mostly manages signaling and creating connections between clients.  
* Talks to handleMessage.js on the server
* 
* How the signaling works.
* Client === Author..
* Client A asks the Server to send Client B a message to do video chat
* Client A begins teh video chat
* Client B either accepts or declines the chat
*
* Why use a third party?
* The RTC spec is changing so much right now I need to use a third party library to help me maintain sanity
*
* What the additional layer of abstraction?
* RTC SDP messages contain private information such as IP addresses, these can be broadcasted publicly without the client
* ever knowing.  This is a security risk.  Having this additional layer of abstraction in place reduces the privacy risk
* and creates a direct line of trust between client A and client B.
*
*****/
if(typeof exports == 'undefined'){
    var exports = this['mymodule'] = {};
}

exports.handleClientMessage_CUSTOM = function(hook, context, wut){
  var action = context.payload.action;
  var padId = context.payload.padId;
  var targetAuthorId = context.payload.targetAuthorId;
  var myAuthorId = context.payload.authorId;

  if(action === 'requestRTC'){ // someone has requested we approve their rtc request - we recieved an offer
    var authorName = escape(context.payload.authorName);
    var acceptIt = "<form class='ep_rtc_form'><input type=button class='#ep_rtc_accept' data-targetAuthorId='"+targetAuthorId+"' data-padId='"+padId+"' data-myAuthorId='"+myAuthorId+"' value='Accept' onClick='etherpadRTC.acceptReq(this);'><input type=button class='#ep_rtc_decline' value='Decline' onClick='etherpadRTC.declineReq(this)'></form>";
    $.gritter.add({
      title: authorName + " would like to create a peer connection with you.",
      text: "Peer connections are used for Video, audio and file sharing.  You should only accept if you trust this person" + acceptIt,
      sticky: false,
      time: 20000
    });
  }
}

var etherpadRTC = {

  /****
  * Begin initiating events to prepare the DOM for Video chat support
  *****/
  init: function(){
    this.listeners();
    if ($('#localVideo').length === 0){
      $('<div id="localVideo"></div><div id="remotesVideos"></div><div id="hangUp">End Call</div><div id="progressIndicator"></div>').insertBefore('#chattext');
    }
  },

  /****
  * Send a request to negotiate RTC to a target client through the server.. 
  *****/
  sendRequest: function(target){
    var authorName = $(target).parent().find('.usertdname').text();
    var type = $(target).data('type');
    var targetAuthorId = $(target).parent().data('authorid');
    var myAuthorId = pad.getUserId();
    var padId = pad.getPadId();

    etherpadRTC.displayVideoChat(); // update the UI to reflect the changes
    etherpadRTC.createRTC(targetAuthorId); // Note that we do this irrespective, this is to speed up the process and remove barriers

    // Create a REQUEST message to send to the server
    var message = {
      type : 'RTC',
      action : 'requestRTC',
      padId : padId,
      targetAuthorId : targetAuthorId,
      myAuthorId : myAuthorId
    }
    pad.collabClient.sendMessage(message);  // Send the request through the server to create a tunnel to the client
    padeditbar.toggleDropDown();
  },

  /****
  * Enable the RTC constructor
  *****/
  createRTC: function(targetAuthorId){

    var padId = pad.getPadId();
    var roomId = padId + "--EP--" + targetAuthorId;
    roomId = encodeURIComponent(roomId);
    
    exports.webrtc = new WebRTC({ // create the new webRTC object
      localVideoEl: 'localVideo',
      remoteVideosEl: 'remotesVideos',
      autoRequestMedia: true
    });
//      media: {audio:true, video: true}
//       iceServers: {"iceServers":[{"url":"stun:stun.stunprotocol.org"}]}


    // extend the webRTC object functionality
    exports.webrtc.on('ready', function () {
      $('#permissionHelper').show();
      $('#progressIndicator').show();
      $('#hangUp').show();
      $('#hangUp').click(function(){
        $('#hangUp').hide();
        exports.webrtc.hangUp();
      });
    });

    exports.webrtc.hangUp = function(){
      $('#hangUp').hide();
    }
    exports.webrtc.on('readyToCall', function () {
      $('#permissionHelper').hide();
      $('#progressIndicator').hide();
      exports.webrtc.joinRoom(roomId); 
    });
  },

  /****
  * Hangup
  *****/ 
  hangUp: function(){
    webrtc.leaveRooms();// hangup a RTC session
    etherpadRTC.hideVideoChat(); // hide the video chat  
  },

  /****
  * Update UI when we go into a chat
  *****/
  displayVideoChat: function(){
    chat.stickToScreen(true);
    $('#chattext').css({'top':'150px'});
  },

  /****
  * Update UI when we leave a chat
  *****/
  hideVideoChat: function(){
    chat.stickToScreen(false);
    $('#chattext').css({'top':'10px'});
  },

  /****
  * Click event handlers
  *****/
  listeners: function(e){
    $('#otheruserstable').on('click', '.usertdname', function(){
      etherpadRTC.appendCallOptions(this);
    });
    $('#otheruserstable').on('click', '.callOptions', function(){
      etherpadRTC.sendRequest(this);
    });
  },

  /****
  * Extend the page to include and remove options to click to call someone
  *****/
  appendCallOptions: function(parent){
    $('.callOptions').remove();
    $(parent).parent().append("<td data-type='video' class='videoCall callOptions' title='Video call this author'>V</td>");
  },

  /****
  * Accept a request from a client
  *****/
  acceptReq: function(e){ // Accept connection and Share RTC information with whoever requested..
    var padId = $(e).data('padid');
    var myAuthorId = $(e).data('myauthorid');
    var targetAuthorId = $(e).data('targetauthorid');
    var request = {
      padId: padId,
      myAuthorId: myAuthorId,
      targetAuthorId: targetAuthorId
    }
    $.gritter.removeAll;  // TODO only remove invite.
    etherpadRTC.displayVideoChat(); // update the UI to reflect the changes
    etherpadRTC.createRTC(request.targetAuthorId); // Accepts and creates the RTC stuff
  },

  /****
  * Decline request from a client
  *****/
  declineReq: function(e){ // Deny an RTC request
    var padId = $(e).data('padid');
    var myAuthorId = $(e).data('myauthorid');
    var targetAuthorId = $(e).data('targetauthorid');
    // Create a message to send to the server
    var message = {
      type : 'RTC',
      action : 'declineRTC',
      padId : padId,
      targetAuthorId : myAuthorId,
      myAuthorId : targetAuthorId
    }
    pad.collabClient.sendMessage(message);  // Send the request through the server to create a tunnel to the client
    $.gritter.removeAll();  // TODO only remove invite.
  }
}

