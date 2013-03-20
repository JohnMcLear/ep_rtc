/****
*
* Handled by the client -- Mostly manages signaling and creating connections between clients.  Talks to handleMessage.js on the server
* 
* How the signaling works.
* Client A asks the Server to send Client B a message to begin Peer connection
* Client B generates SDP information
* Client B asks the Server to the SDP information to Client A
*
*
*
*****/

if(typeof exports == 'undefined'){
    var exports = this['mymodule'] = {};
}
var PeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection || window.mozPeerConnection;
var URL = window.URL || window.webkitURL || window.msURL || window.oURL;
var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
var connection = new PeerConnection({iceServers: [{ url: 'stun:stun.l.google.com:19302' }]});

exports.handleClientMessage_CUSTOM = function(hook, context, wut){
  console.log(context);
  var action = context.payload.action;
  if(action === "requestRTC"){ // someone has requested we approve their rtc request -- we recieved an offer
    var acceptIt = "<form style='margin-top:10px' class='ep_rtc_form'><input type=button style='padding:10px;' class='ep_rtc_accept' value='Accept'><input type=button class='ep_rtc_decline' value='Decline' style='padding:10px;' ></form>";
    $.gritter.add({
      title: context.payload.authorName + " would like to create a peer connection with you.",
      text: "Peer connections are used for Video, audio and file sharing.  You should only accept if you trust this person" + acceptIt,
      sticky: false,
      time: 20000,
      after_open: function(e){

        e.padId = context.payload.padId;
        e.targetAuthorId = context.payload.targetAuthorId;
        e.myAuthorId = context.payload.authorId;

        $('.ep_rtc_accept').click(function(){
          $(e).hide();
          acceptReq(e);
          return false;
        });
        $('.ep_rtc_decline').click(function(){
          $(e).hide();
          declineReq(e);
          return false;
        });
      }
    });
  }
  if(action === "candidateRTC"){ // Someone sent us their candidate information :)
//    if(event.candidate) {
//      server.send({
//        type: 'candidate',
//        label: event.candidate.spdMLineIndex,
//        id: event.candidate.sdpMid,
//        candidate: event.candidate.candidate
//      })
//    }    
   var message = {
      type : 'RTC',
      action : 'candidateRTC',
      label: context.payload.candidate.spdMLineIndex,
      id: context.payload.candidate.sdpMid,
      candidate: context.payload.candidate.candidate
    }
    console.log("SENT cadidate", message);
    pad.collabClient.sendMessage(message);

  }
  if(action === "approveRTC"){ // Someone approved of our RTC request
    connection.setRemoteDescription(new RTCSessionDescription(context.payload))
  } 
  if(action === "declineRTC"){ // someone declined our RTC request
    
  }
  if(action === "SDPRTC"){ // someone sent us their SDP details
    console.log(context.payload);
    connection.setRemoteDescription(new RTCSessionDescription(context.payload.SDP))
  }
}

function acceptReq(e){ // Accept connection and Share RTC information with whoever requested..
  console.log("Creating peer connection from Client B to Client A", e);
  connection.createOffer(function(sessionDescription){
    connection.setLocalDescription(sessionDescription)
    var message = {
      'type' : 'RTC',
      'action' : 'SDPRTC',
      'targetAuthorId' : e.myAuthorId,
      'SDP' : sessionDescription
    }
    console.log("OFFER SENT", message);
    pad.collabClient.sendMessage(message);
  })

/*  connection.setRemoteDescription(new RTCSessionDescription(message));
  connection.createAnswer(function(sessionDescription){
    connection.setLocalDescription(sessionDescription)
    var message = {
      'type' : 'RTC',
      'action' : 'SDPRTC',
      'targetAuthorId' : e.myAuthorId,
      'SDP' : sessionDescription
    }
    pad.collabClient.sendMessage(message);
  });
*/
//  createPeerConnection();
}
function declineReq(e){ // Deny an RTC request
  // Create a message to send to the server
  var message = {
    'type' : 'RTC',
    'action' : 'declineRTC',
    'padId' : e.padId,
    'targetAuthorId' : e.myAuthorId,
    'myAuthorId' : e.targetAuthorId
  }
  console.log("sent ", message);
  pad.collabClient.sendMessage(message);  // Send the request through the server to create a tunnel to the client

}

/*
function createPeerConnection(){
  var pc_config = {"iceServers":[]};
  peerConn = new PeerConnection(pc_config); // create peer object

  peerConn.onicecandidate = function(evt){
    var message = {
      type : "RTC",
      action: "candidate",
      sdpMLineIndex: event.candidate.sdpMLineIndex,
      sdpMid: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    }
    pad.collabClient.sendMessage(message);
  }
}
*/
function decline(){
  // Do nothing.
}










var video_chat = {

  // I use ep_rtc to negotiate a video/audio call between two clients

  /****
  * User is accepting a request to initiate conversation
  *
  *****/
  acceptRequest: function(authorName, authorId){

    $.gritter.add({
      title: "Call invitation from "+authorName,
      text: authorName+" has invited you to a "+type+" call, would you like to join them?",
      sticky: true,
      time: '2000'
    });

  },

  /****
  * Target User has accepted your offer to initiative conversation
  *
  ****/
  targetAcceptedRequest: function(){

    $.gritter.removeAll();
    $.gritter.add({
      title: "In a call with "+authorName,
      text: authorName+" has accepted to join your "+type+" call",
      sticky: false,
      time: '2000'
    });

  },

  /****
  * Send a request from this user to another user to initiate a conversation
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

    // Create a message to send to the server
    var message = {
      'type' : 'RTC',
      'action' : 'requestRTC',
      'padId' : padId,
      'targetAuthorId' : targetAuthorId,
      'myAuthorId' : myAuthorId
    }

    pad.collabClient.sendMessage(message);  // Send the request through the server to create a tunnel to the client
  },

  /****
  *  End call
  ****/
  endCall: function(){

  },
  /****
  *  Create video or audio canvas/media and the streams
  *****/
  createMedia: function(type){
    var sourcevid = document.getElementById('webrtc-sourcevid');
    var remotevid = document.getElementById('webrtc-remotevid');
    var localStream = null;
    var peerConn = null;
    var started = false;
    var channelReady = false;
    var mediaConstraints = {
      'mandatory': {
        'OfferToReceiveAudio':true,
        'OfferToReceiveVideo':true
      }
    };
    var isVideoMuted = false;
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || window.navigator.mozGetUserMedia || navig$
    window.URL = window.URL || window.webkitURL;
  },

  /****
  * Begin displaying Video Chat
  *****/
  displayVideoChat: function(){
    chat.stickToScreen(true);
    $('#chattext').css({'top':'200px'});
  },

  /****
  * Begin initiating events to prepare the DOM for Video chat support
  *****/
  init: function(){
    this.listeners();
    $('body').append('    <video id="video" autoplay="autoplay"></video> '); // TODO LULWUT
  },

  /****
  * Click event handlers
  *****/
  listeners: function(){
    $('#otheruserstable').on('click', '.usertdname', function(){
      video_chat.appendCallOptions(this);
    });
    $('#otheruserstable').on('click', '.callOptions', function(){
      video_chat.sendRequest(this);
    });
  },

  /****
  * Extend the page to include and remove options to click to call someone
  *****/
  appendCallOptions: function(parent){
    $(".callOptions").remove();
    $(parent).parent().append("<td data-type='video' class='videoCall callOptions' title='Video call this author'>V</td>");
    $(parent).parent().append("<td data-type='audio' class='audioCall callOptions' title='Audio call this author'>A</td>");
  }


}

