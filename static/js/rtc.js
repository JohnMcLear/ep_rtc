/****
*
* Handled by the client -- Mostly manages signaling and creating connections between clients.  Talks to handleMessage.js on the server
* 
* How the signaling works.
* Client A asks the Server to send Client B a message to begin Peer connection
* Client B generates SDP information (Ice candidate information)
* Client B asks the Server to the SDP information to Client A
*
*
*
*****/


if(typeof exports == 'undefined'){
    var exports = this['mymodule'] = {};
}

exports.handleClientMessage_CUSTOM = function(hook, context, wut){
  // console.log("new message from server", context);
  var action = context.payload.action;
  if(action === "requestRTC"){ // someone has requested we approve their rtc request -- we recieved an offer
    var authorName = escape(context.payload.authorName);
    var acceptIt = "<form class='ep_rtc_form'><input type=button class='ep_rtc_accept' value='Accept'><input type=button class='ep_rtc_decline' value='Decline'></form>";
    $.gritter.add({
      title: authorName + " would like to create a peer connection with you.",
      text: "Peer connections are used for Video, audio and file sharing.  You should only accept if you trust this person" + acceptIt,
      sticky: false,
      time: 20000,
      after_open: function(e){
        $('.ep_rtc_accept').click(function(){
          etherpadRTC.acceptReq(e); // accep the request
          $(e).hide();
          return false;
        });
        $('.ep_rtc_decline').click(function(){
          etherpadRTC.declineReq(e); // decline the request
          $(e).hide();
          return false;
        });
        e.padId = context.payload.padId;
        e.targetAuthorId = context.payload.targetAuthorId;
        targetAuthorId = e.targetAuthorId; // Horrible Global value
        e.myAuthorId = context.payload.authorId;
      }
    });
  }
}

var etherpadRTC = {

  /****
  * A simple wrapper to create a layer of security before hitting the SimpleWebRTC endpoint
  *
  *****/
  sendRequest: function(target){

    var authorName = $(target).parent().find(".usertdname").text();
    var type = $(target).data('type');
    var targetAuthorId = $(target).parent().data('authorid');
    var myAuthorId = pad.getUserId();
    var padId = pad.getPadId();

    $.gritter.add({
      title: "Trying to call "+authorName,
      text: "Waiting on "+authorName+" to accept your "+type+" call",
      sticky: false,
      time: '20000'
    });

    etherpadRTC.displayVideoChat(); // update the UI to reflect the changes

    var webrtc = new WebRTC({
      // the id/element dom element that will hold "our" video
      localVideoEl: 'localVideo',
      // the id/element dom element that will hold remote videos
      remoteVideosEl: 'remotesVideos',
      // immediately ask for camera access
      autoRequestMedia: true
    });

    // we have to wait until it's ready
    webrtc.on('readyToCall', function () {
      // you can name it anything
      webrtc.joinRoom(padId + "--\\--" + myAuthorId);
    });

    // Create a message to send to the server
    var message = {
      'type' : 'RTC',
      'action' : 'requestRTC',
      'padId' : padId,
      'targetAuthorId' : targetAuthorId,
      'myAuthorId' : myAuthorId
    }

    pad.collabClient.sendMessage(message);  // Send the request through the server to create a tunnel to the client
    this.displayVideoChat();
    padeditbar.toggleDropDown();
  },

  /****
  * Update UI when we go into a chat
  *****/
  displayVideoChat: function(){
    chat.stickToScreen(true);
    $('#chattext').css({'top':'150px'});
  },

  /****
  * Begin initiating events to prepare the DOM for Video chat support
  *****/
  init: function(){
    this.listeners();
    if ($("#localVideo").length === 0){
      $('<div id="localVideo"></div><div id="remotesVideos"></div>').insertBefore('#chattext');
    }
  },

  /****
  * Click event handlers
  *****/
  listeners: function(){
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
    $(".callOptions").remove();
    $(parent).parent().append("<td data-type='video' class='videoCall callOptions' title='Video call this author'>V</td>");
    $(parent).parent().append("<td data-type='audio' class='audioCall callOptions' title='Audio call this author'>A</td>");
  },


  /****
  * Accepta request from a client
  *****/
  acceptReq: function(e){ // Accept connection and Share RTC information with whoever requested..
    etherpadRTC.displayVideoChat(); // update the UI to reflect the changes
    var webrtc = new WebRTC({
      // the id/element dom element that will hold "our" video
      localVideoEl: 'localVideo',
      // the id/element dom element that will hold remote videos
      remoteVideosEl: 'remotesVideos',
      // immediately ask for camera access
     autoRequestMedia: true
    });
    // we have to wait until it's ready
    webrtc.on('readyToCall', function () {
      // you can name it anything
      webrtc.joinRoom(e.padId + "--\\--" + e.myAuthorId);
    });
  },

  /****
  * Decline request from a client
  *****/
  declineReq: function(e){ // Deny an RTC request
    // Create a message to send to the server
    var message = {
      'type' : 'RTC',
      'action' : 'declineRTC',
      'padId' : e.padId,
      'targetAuthorId' : e.myAuthorId,
      'myAuthorId' : e.targetAuthorId
    }
    pad.collabClient.sendMessage(message);  // Send the request through the server to create a tunnel to the client
    $.gritter.removeAll();  // TODO only remove invite.
  }
}

