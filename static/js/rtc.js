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
var connection = null;

if (navigator.mozGetUserMedia) {
  connection = new mozRTCPeerConnection(iceServers);
  RTCSessionDescription = mozRTCSessionDescription;
  getUserMedia = navigator.mozGetUserMedia.bind(navigator);
} else if (navigator.webkitGetUserMedia) {
  connection = new webkitRTCPeerConnection(iceServers);
  RTCSessionDescription = navigator.webkitRTCSessionDescription;
  getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
}

connection.onicecandidate = function(e) { // Fired by connection.setLocalDescription
  console.log("ONICECANDIDATE", e);
  if(e.candidate) {
    candidateInfo = true;
    console.log("ICE candidate" , e);
    var message = {
      type : 'RTC',
      action: 'candidateRTC',
      targetAuthorId : myAuthorId, // make sure this RTC message always targets a specific author..
      label: e.candidate.sdpMLineIndex,
      id: e.candidate.sdpMid,
      candidate: e.candidate.candidate
     }
    console.log("candidate SENT", message);
    pad.collabClient.sendMessage(message);
  }
}

// Wire up the video stream once we get it
connection.onaddstream = function(event) {
  console.log("onaddstream", e);
  video.src = URL.createObjectURL(event.stream)
}

var iceServers = {iceServers: [{ url: 'stun:stun.l.google.com:19302' }]}; // TODO don't use Google's servers
var myAuthorId, targetAuthorId; // HACKY to be resolved in refactor..
var candidateInfo = false; // this is never used..  TODO Find out why..

exports.handleClientMessage_CUSTOM = function(hook, context, wut){
  // console.log("new message from server", context);
  var action = context.payload.action;

  if(action === "requestRTC"){ // someone has requested we approve their rtc request -- we recieved an offer
    var acceptIt = "<form style='margin-top:10px' class='ep_rtc_form'><input type=button style='padding:10px;' class='ep_rtc_accept' value='Accept'><input type=button class='ep_rtc_decline' value='Decline' style='padding:10px;' ></form>";
    $.gritter.add({
      title: context.payload.authorName + " would like to create a peer connection with you.",
      text: "Peer connections are used for Video, audio and file sharing.  You should only accept if you trust this person" + acceptIt,
      sticky: false,
      time: 20000,
      after_open: function(e){
        $('.ep_rtc_accept').click(function(){
          acceptReq(e); // accep the request
          $(e).hide();
          return false;
        });
        $('.ep_rtc_decline').click(function(){
          declineReq(e); // decline the request
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

  if(action === "candidateRTC"){ // Someone sent us their candidate information
    console.log("Recieved candidate", context);
    connection.addIceCandidate(new RTCIceCandidate({
      sdpMLineIndex: context.payload.label,
      candidate: context.payload.candidate
    }))

    // Reply with our candidate details..
    var message = {
      type : 'RTC',
      action: 'candidateRTC',
      targetAuthorId : targetAuthorId, // make sure this RTC message always targets a specific author..
      label: event.candidate.spdMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    }
    console.log("candidate SENT", message);
    pad.collabClient.sendMessage(message);
  }

  if(action === "approveRTC"){ // Someone approved of our RTC request
    console.log("Recieved Approved RTC, setting remote description:", context.payload);

    // SDP is wrong here.. TODO is it?
    connection.setRemoteDescription(new RTCSessionDescription(context.payload.SDP));
    console.log("ANSWER SENT");
    connection.createAnswer(function(sessionDescription){
      console.log("sessionDES2", sessionDescription);
      connection.setLocalDescription(sessionDescription);
      myAuthorId = context.payload.authorId;
      console.log("sending answer have available", context);
      var message = {
        type : 'RTC',
        action: 'SDPRTC',
        myAuthorId : context.payload.targetAuthorId,
        targetAuthorId : myAuthorId, // make sure this RTC message always targets a specific author..
        SDP: sessionDescription
      }
      console.log("SDPRTC SENT", message);
      pad.collabClient.sendMessage(message);
    })

  } 
  if(action === "declineRTC"){ // someone declined our RTC request
    // TODO close dialogue?
  }

  // This is the same as approveRTC..  WTF?
  if(action === "SDPRTC"){ // someone sent us their SDP details
    console.log("We got SDP Details from a client", context.payload);
    connection.setRemoteDescription(new RTCSessionDescription(context.payload.SDP))
  }
}

function requestPerms(){ // Ask for access to the video and audio devices
    // Attach a media stream to an element.
    var element = document.getElementById("video");
    console.log(element);
    attachMediaStream = function(element, stream) {
        element.mozSrcObject = stream;
        element.play();
    };

/*  navigator.getUserMedia({
    audio: true,
    video: true
    }, 
    function(stream){
      console.log(stream);
      connection.addStream(stream);
      video.src = URL.createObjectURL(stream);
    }, 
    null
  );
*/

  getUserMedia({audio: true, video: {
    mandatory: {},
    optional: []
  }}, function (stream) {
    attachMediaStream(element || self.getLocalVideoContainer(), stream);
    if (navigator.webkitGetUserMedia) {
      video.src = URL.createObjectURL(stream);
    }
    self.localStream = stream;
    self.testReadiness();
  }, function () {
    throw new Error('Failed to get access to local media.');
  });
}

function onUserMediaSuccess(stream){ // Once we have a good video or audio stream
  connection.addStream(stream);
  video.src = URL.createObjectURL(stream)
}

function acceptReq(e){ // Accept connection and Share RTC information with whoever requested..
  console.log("Creating peer connection from Client B to Client A");
  connection.createOffer(function(sessionDescription){
    myAuthorId = e.myAuthorId; // Another horrible Global value
    connection.setLocalDescription(sessionDescription); // I FIRE THE ICE CANDIDATE!

    // Send my session information
    var message = {
      'type' : 'RTC',
      'action' : 'SDPRTC',
      'targetAuthorId' : e.myAuthorId,
      'SDP' : sessionDescription
    }
    console.log("OFFER SENT", message);
    pad.collabClient.sendMessage(message);

    // And send an approval
    var message = {
      'type' : 'RTC',
      'action' : 'approveRTC',
      'myAuthorId' : e.targetAuthorId,
      'targetAuthorId' : e.myAuthorId,
      'SDP' : sessionDescription
    }
    console.log("ACCEPT RTC SENT", message);
    pad.collabClient.sendMessage(message);
    requestPerms(); // request access to hardware
    video_chat.displayVideoChat(); // update the UI to reflect the changes
  })
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
  console.log("SENT DECLINE ", message);
  pad.collabClient.sendMessage(message);  // Send the request through the server to create a tunnel to the client
}

function decline(){
  $.gritter.removeAll();  // TODO only remove invite.
}


function testReadiness() {
  if (this.localStream && this.sessionReady) {
    this.emit('readyToCall', this.connection.socket.sessionid);
  }
};

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
    requestPerms();
    this.displayVideoChat();
    padeditbar.toggleDropDown();
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
    window.URL = window.URL || window.webkitURL;
  },

  /****
  * Begin displaying Video Chat
  *****/
  displayVideoChat: function(){
    chat.stickToScreen(true);
    $('#chattext').css({'top':'300px'});
  },

  /****
  * Begin initiating events to prepare the DOM for Video chat support
  *****/
  init: function(){

    this.listeners();
//    $('#chattext').insertBefore('<video id="video" autoplay="autoplay"></video> '); // TODO LULWUT
    $('<video id="video" style="margin-top:10px;" width="100%" autoplay="autoplay"></video>').insertBefore('#chattext');
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

