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
      'action' : 'request',
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
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || window.navigator.mozGetUserMedia || navigator.msGetUserMedia;
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

