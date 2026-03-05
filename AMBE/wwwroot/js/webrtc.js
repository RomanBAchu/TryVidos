let localStream;
let peerConnections = {};
let dotNetHelper;

const config = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Используем TURN через 443 порт (пробивает почти любые блокировки)
        {
            urls: ['turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'],
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ],
    iceCandidatePoolSize: 10
};

window.prepareWebRTC = async (helper) => {
    dotNetHelper = helper;
    try {
        // Запрашиваем камеру сразу, чтобы треки были готовы к моменту звонка
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const localVideo = document.getElementById('localVideo');
        if (localVideo) localVideo.srcObject = localStream;
        console.log("Camera OK");
    } catch (e) { console.error("Camera error:", e); }
};

function createPC(remoteId) {
    // Если соединение с этим человеком уже есть — возвращаем его
    if (peerConnections[remoteId]) return peerConnections[remoteId];

    console.log("Creating connection for:", remoteId);
    const pc = new RTCPeerConnection(config);

    // Добавляем наши медиа-данные в это соединение
    if (localStream) {
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    // Когда браузер нашел путь (ICE-кандидат), шлем его конкретному человеку
    pc.onicecandidate = (e) => {
        if (e.candidate && dotNetHelper) {
            dotNetHelper.invokeMethodAsync('SendIceCandidate', JSON.stringify(e.candidate), remoteId);
        }
    };

    // Когда пришло видео от удаленного участника
    pc.ontrack = (e) => {
        console.log("Stream received from:", remoteId);
        // Ищем свободный слот или слот, который уже закреплен за этим ID
        for (let i = 1; i <= 3; i++) {
            let videoEl = document.getElementById(`remoteVideo${i}`);
            if (videoEl && (!videoEl.srcObject || videoEl.getAttribute("data-id") === remoteId)) {
                // Фикс для Safari и старых браузеров
                videoEl.srcObject = (e.streams && e.streams[0]) ? e.streams[0] : new MediaStream([e.track]);
                videoEl.setAttribute("data-id", remoteId);
                break;
            }
        }
    };

    peerConnections[remoteId] = pc;
    return pc;
}

// Создание звонка
window.createOffer = async (remoteId) => {
    const pc = createPC(remoteId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return JSON.stringify(offer);
};

// Прием звонка
window.processOffer = async (offerJson, remoteId) => {
    const pc = createPC(remoteId);
    await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerJson)));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return JSON.stringify(answer);
};

// Завершение рукопожатия
window.processAnswer = async (ansJson, remoteId) => {
    const pc = peerConnections[remoteId];
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(ansJson)));
};

// Добавление сетевых маршрутов
window.addIceCandidate = async (candJson, remoteId) => {
    const pc = peerConnections[remoteId];
    if (pc) {
        try {
            await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candJson)));
        } catch (e) { console.warn("ICE candidate error", e); }
    }
};

// Очистка при выходе
window.hangUp = () => {
    for (let id in peerConnections) {
        peerConnections[id].close();
        delete peerConnections[id];
    }
    for (let i = 1; i <= 3; i++) {
        let v = document.getElementById(`remoteVideo${i}`);
        if (v) { v.srcObject = null; v.removeAttribute("data-id"); }
    }
};
