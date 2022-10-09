var qrcode_detector = undefined;
var base_path = undefined;
async function fetchModelsData(name) {
    const response = await fetch(base_path + 'models/' + name, {
        method: "GET",
    });
    const data = await response.arrayBuffer();
    return new Uint8Array(data);
};

async function loadModels() {
    const detect_proto = "detect.prototxt";
    const detect_weight = "detect.caffemodel";
    const sr_proto = "sr.prototxt";
    const sr_weight = "sr.caffemodel";

    if (qrcode_detector != undefined) {
        //console.log("Model Existed");
    } else {
        const dp = await fetchModelsData(detect_proto);
        const dw = await fetchModelsData(detect_weight);
        const sp = await fetchModelsData(sr_proto);
        const sw = await fetchModelsData(sr_weight);

        cv.FS_createDataFile("/", "detect.prototxt", dp, true, false, false);
        cv.FS_createDataFile("/", "detect.caffemodel", dw, true, false, false);
        cv.FS_createDataFile("/", "sr.prototxt", sp, true, false, false);
        cv.FS_createDataFile("/", "sr.caffemodel", sw, true, false, false);

        qrcode_detector = new cv.wechat_qrcode_WeChatQRCode(
            "detect.prototxt",
            "detect.caffemodel",
            "sr.prototxt",
            "sr.caffemodel"
        );
        //console.log("OpenCV Model Created")
    }
}

function loadScript(url) {
    return new Promise((resolve, reject) => {
        let script = document.createElement("script");
        script.setAttribute("async", "");
        script.setAttribute("type", "text/javascript");
        script.setAttribute("id", "opencvjs");
        script.addEventListener("load", async () => {
            if (cv.getBuildInformation) {
                //console.log(cv.getBuildInformation());
                resolve();
            } else {
                // WASM
                if (cv instanceof Promise) {
                    cv = await cv;
                    //console.log(cv.getBuildInformation());
                    resolve();
                } else {
                    cv["onRuntimeInitialized"] = () => {
                        //console.log(cv.getBuildInformation());
                        resolve();
                    };
                }
            }
        });
        script.addEventListener("error", () => {
            reject();
        });
        script.src = url;
        let node = document.getElementsByTagName("script")[0];
        node.parentNode.insertBefore(script, node);
    });
};

window.addEventListener("message", (event) => {
    if (event.data.message == 'base_path') {
        base_path = event.data.data
        loadScript(base_path + `sandbox/opencv.js`).then(
            () => {
                loadModels();
            },
            () => {
                console.error("Failed to load " + base_path + `sandbox/opencv.js`);
            }
        );
    } else if (event.data.message == 'qrcode_img') {
        var image = new Image()
        image.src = event.data.data;
        image.onload = function () {
            let inputImage = cv.imread(image, cv.IMREAD_GRAYSCALE);
            let points_vec = new cv.MatVector();
            let res = qrcode_detector.detectAndDecode(inputImage, points_vec);
            let x = undefined;
            let y = undefined;
            let width = undefined;
            let height = undefined;
            let points = points_vec.get(0);
            if (points) {
                x = points.floatAt(0);
                y = points.floatAt(1);
                width = points.floatAt(4) - points.floatAt(0);
                height = points.floatAt(5) - points.floatAt(1);
            }
            event.source.postMessage({ message: 'qrcode_result', data: { result: res.get(0), x: x, y: y, width: width, height: height } }, event.origin);
        }

    }
});