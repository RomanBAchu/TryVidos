let localStream;
let pcs = {};
let dotNetHelper;

const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

window.prepareWebRTC = (helper) => { dotNetHelper = helper; };

window.spideyVibrate = (pattern) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
};

window.scrollToEnd = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollTop = el.scrollHeight;
};

window.startLocalVideo = async (id) => {
    try {
        if (!localStream) {
            localStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240, frameRate: 15 },
                audio: true
            });
        }
        document.getElementById(id).srcObject = localStream;
        return true;
    } catch (e) { return false; }
};

function getOrCreatePC(remoteId) {
    if (pcs[remoteId]) return pcs[remoteId];
    const pc = new RTCPeerConnection(config);
    pcs[remoteId] = pc;
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    pc.onicecandidate = (e) => {
        if (e.candidate && dotNetHelper) {
            dotNetHelper.invokeMethodAsync('SendSignalJS', JSON.stringify(e.candidate), remoteId).catch(() => { });
        }
    };
    pc.ontrack = (e) => {
        let v = document.getElementById("video_" + remoteId);
        if (!v) {
            v = document.createElement("video");
            v.id = "video_" + remoteId; v.autoplay = true; v.playsinline = true; v.className = "remote-v";
            document.getElementById("remoteVideos").appendChild(v);
        }
        v.srcObject = e.streams;
    };
    return pc;
}

window.createOfferGroup = async (id) => {
    const pc = getOrCreatePC(id);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return JSON.stringify(offer);
};

window.processOfferGroup = async (json, id) => {
    const pc = getOrCreatePC(id);
    await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(json)));
    const ans = await pc.createAnswer();
    await pc.setLocalDescription(ans);
    return JSON.stringify(ans);
};

window.processAnswerGroup = async (json, id) => {
    if (pcs[id]) await pcs[id].setRemoteDescription(new RTCSessionDescription(JSON.parse(json)));
};

window.addIceCandidateGroup = async (json, id) => {
    if (pcs[id]) await pcs[id].addIceCandidate(new RTCIceCandidate(JSON.parse(json)));
};

window.removeUser = (id) => {
    if (pcs[id]) { pcs[id].close(); delete pcs[id]; document.getElementById("video_" + id)?.remove(); }
};

window.hangup = () => {
    Object.keys(pcs).forEach(id => window.removeUser(id));
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
    const lv = document.getElementById('localVideo');
    if (lv) lv.srcObject = null;
};
