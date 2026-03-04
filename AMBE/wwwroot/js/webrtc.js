let localStream;
let peerConnection;
let dotNetHelper;
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// Подготовка моста между JS и C#
window.prepareWebRTC = (helper) => {
    dotNetHelper = helper;
};

// Включение камеры
window.startLocalVideo = async (id) => {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById(id).srcObject = localStream;
};

// Создание звонка (Offer)
window.createOffer = async () => {
    peerConnection = new RTCPeerConnection(config);

    localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));

    peerConnection.onicecandidate = (e) => {
        if (e.candidate && dotNetHelper) {
            dotNetHelper.invokeMethodAsync('SendIceCandidate', JSON.stringify(e.candidate));
        }
    };

    peerConnection.ontrack = (e) => {
        document.getElementById('remoteVideo').srcObject = e.streams[0];
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return JSON.stringify(offer);
};

// Ответ на звонок (Answer)
window.processOffer = async (offerJson) => {
    if (!peerConnection) {
        peerConnection = new RTCPeerConnection(config);
        peerConnection.onicecandidate = (e) => {
            if (e.candidate && dotNetHelper) {
                dotNetHelper.invokeMethodAsync('SendIceCandidate', JSON.stringify(e.candidate));
            }
        };
        peerConnection.ontrack = (e) => {
            document.getElementById('remoteVideo').srcObject = e.streams[0];
        };
    }

    localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));
    await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerJson)));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    return JSON.stringify(answer);
};

window.processAnswer = async (ansJson) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(ansJson)));
};

window.addIceCandidate = async (candJson) => {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(JSON.parse(candJson)));
    } catch (e) { console.error("Error adding ice candidate", e); }
};
