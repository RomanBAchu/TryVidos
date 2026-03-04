let localStream;
let peerConnection;
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

window.prepareWebRTC = () => {
    peerConnection = new RTCPeerConnection(config);
    peerConnection.ontrack = (event) => {
        const remoteVid = document.getElementById('remoteVideo');
        if (remoteVid) remoteVid.srcObject = event.streams[0];
    };
};

window.startLocalVideo = async (id) => {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById(id).srcObject = localStream;
};

window.createOffer = async () => {
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return JSON.stringify(offer);
};

window.processOffer = async (offerJson) => {
    if (!peerConnection) window.prepareWebRTC();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerJson)));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    return JSON.stringify(answer);
};

window.processAnswer = async (answerJson) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(answerJson)));
};

window.stopLocalVideo = () => {
    if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        document.getElementById('localVideo').srcObject = null;
    }
};
