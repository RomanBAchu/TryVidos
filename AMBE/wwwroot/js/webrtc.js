let localStream;
let peerConnection;
let dotNetHelper;
let iceCandidatesQueue = [];

// ТВОЙ КОНФИГ С ЛИЧНЫМИ КЛЮЧАМИ И ОПТИМИЗАЦИЕЙ ТРАФИКА
const config = {
    iceServers: [
        { urls: "stun:stun.relay.metered.ca:80" },
        {
            urls: "turn:global.relay.metered.ca:80",
            username: "2e7e778f6d1b07b279414c2d",
            credential: "MOO2Lssrfa/+i8LI",
        },
        {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: "2e7e778f6d1b07b279414c2d",
            credential: "MOO2Lssrfa/+i8LI",
        },
        {
            urls: "turn:global.relay.metered.ca:443",
            username: "2e7e778f6d1b07b279414c2d",
            credential: "MOO2Lssrfa/+i8LI",
        },
        {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "2e7e778f6d1b07b279414c2d",
            credential: "MOO2Lssrfa/+i8LI",
        }
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle'
};

window.prepareWebRTC = (helper) => {
    dotNetHelper = helper;
    console.log("!!! WebRTC мост установлен !!!");
};

// ФУНКЦИЯ ЭКОНОМИИ ТРАФИКА (320x240, 15 FPS)
window.startLocalVideo = async (id) => {
    console.log("Включаю ультра-экономный режим видео...");
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 320 },
                height: { ideal: 240 },
                frameRate: { max: 15 } // Экономим трафик в 2 раза
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true
            }
        });
        const videoElem = document.getElementById(id);
        if (videoElem) videoElem.srcObject = localStream;
    } catch (err) {
        console.error("Ошибка камеры:", err);
    }
};

function createPC() {
    console.log("Создаю PeerConnection (Экономный режим)...");
    peerConnection = new RTCPeerConnection(config);

    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }

    peerConnection.onicecandidate = (e) => {
        if (e.candidate && dotNetHelper) {
            dotNetHelper.invokeMethodAsync('SendIceCandidate', JSON.stringify(e.candidate));
        }
    };

    peerConnection.ontrack = (e) => {
        console.log("ВИДЕО ПОЛУЧЕНО!");
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) {
            remoteVideo.srcObject = e.streams[0];
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log("Статус ICE:", peerConnection.iceConnectionState);
    };
}

window.createOffer = async () => {
    if (!peerConnection) createPC();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return JSON.stringify(offer);
};

window.processOffer = async (offerJson) => {
    if (!peerConnection) createPC();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerJson)));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    // Чистим очередь кандидатов после установки описания
    while (iceCandidatesQueue.length > 0) {
        const cand = iceCandidatesQueue.shift();
        await peerConnection.addIceCandidate(cand).catch(e => { });
    }
    return JSON.stringify(answer);
};

window.processAnswer = async (ansJson) => {
    if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(ansJson)));
        while (iceCandidatesQueue.length > 0) {
            const cand = iceCandidatesQueue.shift();
            await peerConnection.addIceCandidate(cand).catch(e => { });
        }
    }
};

window.addIceCandidate = async (candJson) => {
    const candidate = new RTCIceCandidate(JSON.parse(candJson));
    if (!peerConnection || !peerConnection.remoteDescription || !peerConnection.remoteDescription.type) {
        iceCandidatesQueue.push(candidate);
    } else {
        await peerConnection.addIceCandidate(candidate).catch(e => { });
    }
};
