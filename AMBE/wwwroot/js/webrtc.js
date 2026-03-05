let localStream;
let peerConnection;
let dotNetHelper;
let iceCandidatesQueue = [];

const config = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: '2e7e778f6d1b07b279414c2d',
            credential: 'MOO2Lssrfa/+i8LI'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: '2e7e778f6d1b07b279414c2d',
            credential: 'MOO2Lssrfa/+i8LI'
        }
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle'
};

window.prepareWebRTC = (helper) => {
    dotNetHelper = helper;
    console.log("!!! WebRTC мост установлен !!!");
};

window.startLocalVideo = async (id) => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const videoElem = document.getElementById(id);
        if (videoElem) videoElem.srcObject = localStream;
    } catch (err) {
        console.error("Ошибка камеры:", err);
    }
};

function createPC() {
    console.log("Создаю PeerConnection (v4 стабильный)...");
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
        console.log("ВИДЕОПОТОК ПОЛУЧЕН!");
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) remoteVideo.srcObject = e.streams[0];
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log("ICE State:", peerConnection.iceConnectionState);
        // АВТОВОССТАНОВЛЕНИЕ: Если дисконнект — не сдаемся
        if (peerConnection.iceConnectionState === 'disconnected' || peerConnection.iceConnectionState === 'failed') {
            console.log("Попытка восстановить связь...");
            // Здесь можно вызвать Ice Restart, если нужно
        }
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
    const offer = new RTCSessionDescription(JSON.parse(offerJson));
    await peerConnection.setRemoteDescription(offer);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    // ВАЖНО: Добавляем кандидатов строго ПОСЛЕ setRemoteDescription
    processQueue();

    return JSON.stringify(answer);
};

window.processAnswer = async (ansJson) => {
    const answer = new RTCSessionDescription(JSON.parse(ansJson));
    await peerConnection.setRemoteDescription(answer);
    processQueue();
};

async function processQueue() {
    while (iceCandidatesQueue.length > 0) {
        const cand = iceCandidatesQueue.shift();
        try {
            await peerConnection.addIceCandidate(cand);
        } catch (e) {
            console.warn("Ошибка очереди ICE:", e);
        }
    }
}

window.addIceCandidate = async (candJson) => {
    const candidate = new RTCIceCandidate(JSON.parse(candJson));
    // Если дескрипшн еще не стоит — копим в очередь
    if (!peerConnection || !peerConnection.remoteDescription || !peerConnection.remoteDescription.type) {
        iceCandidatesQueue.push(candidate);
    } else {
        await peerConnection.addIceCandidate(candidate).catch(e => console.warn(e));
    }
};
