window.onload = () => {
    let playing = false;

    document.getElementById("start").addEventListener("click", () => {
        if(playing || !navigator.mediaDevices.getUserMedia) return;

        navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            playing = true;
            const player = document.getElementById("player");
            player.srcObject = stream;
        })
        .catch((err) => {
            playing = false;
            console.log("Failed to stream webcam\n" + err);
        });
    });

    document.getElementById("stop").addEventListener("click", () => {
        if(!playing) return;
        playing = false;

        const player = document.getElementById("player");
        const stream = player.srcObject;

        stream.getTracks().forEach(track => track.stop());
        player.srcObject = null;
    });
}