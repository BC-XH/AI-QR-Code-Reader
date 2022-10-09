const MAX_LAYER_INDEX = 2147483647;
var screenShotDataUri = null;
var container;
var mouseDownOnContainer = false;
var scanBox;
var canvas;
var boundingBox = {};
var ratio = 1;
var htmlScreen = { w: document.documentElement.clientWidth, h: document.documentElement.clientHeight };

var iframe = document.createElement('iframe');
iframe.src = chrome.runtime.getURL(`./sandbox/sandbox.html`)
iframe.style.display = 'none';
iframe.onload = function () {
    iframe.contentWindow.postMessage({ message: 'base_path', data: chrome.runtime.getURL('') }, "*");
}

var infoBar = $('<div>').html(chrome.i18n.getMessage("infoBar") + '&emsp;<a style="color:#333" target="_blank" href="https://github.com/BC-XH/AI-QR-Code-Reader">View on Github</a>').css({
    position: 'absolute',
    top: '10px',
    left: '10px',
    color: '#333',
    fontWeight: 'bold',
    textShadow: '0 0 12px #FFF',
    maxWidth: 'calc(100% - 70px)'
});

$.fn.disableScroll = function () {
    window.oldScrollPos = $(window).scrollTop();

    $(window).on('scroll.scrolldisabler', function (event) {
        $(window).scrollTop(window.oldScrollPos);
        event.preventDefault();
    });
};

$.fn.enableScroll = function () {
    $(window).off('scroll.scrolldisabler');
};

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        screenShotDataUri = null;
        if (request.data) {
            modalDisplaySwitch();
            updatehtmlScreen();
            screenShotDataUri = request.data;
            sendResponse({ 'status': "ok" });

        }
    });

window.addEventListener("message", (event) => {
    if (event.data.message == 'qrcode_result') {
        var data = event.data.data;
        if (data.result) {
            setReco(boundingBox.x + data.x + data.width / 2 + 6, boundingBox.y + data.y + data.height / 2 + 6, data.result);
        }

    }
});
window.addEventListener('resize', function () {
    updatehtmlScreen();
});


var recoIcon = $('<div>').text('>')
    .css({
        lineHeight: '30px',
        fontSize: '18px',
        fontWeight: 'bold',
        textAlign: 'center',
        color: 'white',
        position: 'absolute',
        top: '-100px',
        left: '-100px',
        zIndex: MAX_LAYER_INDEX,
        transform: 'translate(-50%,-50%)',
        border: '5px solid white',
        background: '#279847',
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        boxShadow: '0 0 5px gray'
    });
var recoContent = $('<div>').html('<span id="__qrcode_text"></span><br>')
    .css({
        position: 'absolute',
        zIndex: MAX_LAYER_INDEX - 1,
        color: 'black',
        fontSize: '14px',
        background: 'white',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 0 5px gray',
        userSelect: 'text',
        wordBreak: 'break-all'
    })
    .append($('<span>').css({
        color: 'gray',
        cursor: 'pointer',
        fontSize: '12px'
    }).text(chrome.i18n.getMessage("copy")).on('click', function () {
        let that = this;
        let tmr;
        copyToClipboard($(this).parent().find('#__qrcode_text').text(), () => {
            clearTimeout(tmr);
            $(that).text(chrome.i18n.getMessage("copySuccess"));
            tmr = setTimeout(function () {
                $(that).text(chrome.i18n.getMessage("copy"));
            }, 1500);
        }, () => {
            clearTimeout(tmr);
            $(that).text(chrome.i18n.getMessage("copyFail"));
            tmr = setTimeout(function () {
                $(that).text(chrome.i18n.getMessage("copy"));
            }, 1500);
        });
    }));
function initReco() {
    recoIcon.css({ top: '-100px', left: '-100px' });
    recoContent.css({ left: '-100px', right: '', top: '-100px', bottom: '' }).children('#__qrcode_text').text('');
}

function setReco(x, y, text) {
    recoIcon.css({ left: x + 'px', top: y + 'px' });
    recoContent.css({
        left: '',
        right: '',
        top: '',
        bottom: '',
        maxWidth: htmlScreen.w / 2 + 'px',
        maxHeight: htmlScreen.h / 2 + 'px',
        overflow: 'auto'
    });
    recoContent.children('#__qrcode_text').html(text.replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll(/((((?!\s|\:).){2,15}\:\/\/)|magnet\:\?xt\=urn\:btih\:)((?!\s|\:\/\/).)+/ig, function (match) {
        return '<a target="_blank" href="' + match + '">' + match + '</a>';
    }));
    if (x < htmlScreen.w / 2) {
        recoContent.css({ left: x + 'px' });
    } else {
        recoContent.css({ right: htmlScreen.w - x + 'px' });
    }
    if (y < htmlScreen.h / 2) {
        recoContent.css({ top: y + 'px' });
    } else {
        recoContent.css({ bottom: htmlScreen.h - y + 'px' });
    }

}

function copyToClipboard(text, success = function () { }, error = function () { }) {
    if (window.clipboardData && window.clipboardData.setData) {
        success();
        return window.clipboardData.setData("Text", text);
    }
    else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
        var textarea = document.createElement("textarea");
        textarea.textContent = text;
        textarea.style.position = "fixed";
        document.body.appendChild(textarea);
        textarea.select();
        try {
            var res = document.execCommand("copy");
            success();
            return res;
        }
        catch (ex) {
            error();
            return prompt("Copy to clipboard: Ctrl+C, Enter", text);
        }
        finally {
            document.body.removeChild(textarea);
        }
    }
}

function disableDefaultEvt() {
    return false;
}

function initModal() {
    mouseDownOnContainer = false;
    canvas = document.createElement('canvas');
    scanBox = $('<div>').css({
        position: 'absolute',
        top: '-10px',
        left: '-10px',
        border: '1px solid  #F88',
        borderRadius: '8px',
        boxShadow: '0 0 0 1px #222, 0 0 0 1px #222 inset',
        boxSizing: 'border-box',
        zIndex: MAX_LAYER_INDEX - 2
    });
    var startPos = {};
    container = $('<div>')
        .css({
            width: htmlScreen.w + 'px',
            height: htmlScreen.h + 'px',
            position: 'fixed',
            draggable: "false",
            left: 0,
            top: 0,
            zIndex: MAX_LAYER_INDEX - 3,
            display: 'none',
            userSelect: 'none'
        }).html('<div style="position: relative;top:0;left:0;width:100%;height:100%"></div>');
    var mask = $('<div>').css({
        width: '100%',
        height: '100%',
        position: 'absolute',
        background: 'rgba(255,255,255,0.4)',
        cursor: 'crosshair'
    });
    mask.on('mousedown', function (e) {
        if (e.button == 2) {
            modalDisplaySwitch();
        }
        mouseDownOnContainer = true;
        initReco();
        startPos = { top: e.clientY, left: e.clientX, x: e.clientX, y: e.clientY, width: 0, height: 0 };
        scanBox.css(startPos);
    }).append(scanBox);
    container.on('mousemove', function (e) {
        if (!mouseDownOnContainer) return;
        if (e.clientY < startPos.y) {
            scanBox.css({ top: e.clientY, height: startPos.y - e.clientY });
        } else {
            scanBox.css({ top: startPos.y, height: e.clientY - startPos.y });
        }
        if (e.clientX < startPos.x) {
            scanBox.css({ left: e.clientX, width: startPos.x - e.clientX });
        } else {
            scanBox.css({ left: startPos.x, width: e.clientX - startPos.x });
        }
    }).on('mouseup blur mouseleave', function (e) {
        if (!mouseDownOnContainer) return;
        mouseDownOnContainer = false;
        boundingBox = getScanBox();
        if (boundingBox.width < 40 || boundingBox.height < 40) {
            scanBox.css({ top: '-10px', left: '-10px', width: 0, height: 0 });
            return;
        }
        canvas.width = boundingBox.width;
        canvas.height = boundingBox.height;
        var img = new Image();
        img.src = screenShotDataUri;
        img.onload = function () {
            ratio = (img.width / htmlScreen.w + img.height / htmlScreen.h) / 2;
            var ctx = canvas.getContext("2d");
            ctx.drawImage(img, boundingBox.x * ratio, boundingBox.y * ratio, boundingBox.width * ratio, boundingBox.height * ratio, 0, 0, boundingBox.width, boundingBox.height);
            iframe.contentWindow.postMessage({ message: 'qrcode_img', data: canvas.toDataURL('image/png') }, "*");
        }

    })
    container.children('div').append(mask);
    var closebtn = $('<div>').text('X')
        .css({
            position: 'absolute',
            top: '20px',
            right: '20px',
            fontSize: '16px',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold',
            border: '5px solid white',
            borderRadius: '50%',
            background: '#E53D30',
            width: '30px',
            height: '30px',
            lineHeight: '30px',
            textAlign: 'center',
            boxShadow: '0 0 5px gray'
        }).click(modalDisplaySwitch);
    container.append(closebtn).append(recoIcon).append(recoContent).append(infoBar);
    $('body').append(container).append(iframe);
}
function getScanBox() {
    var pos = scanBox.offset();
    pos.width = scanBox.width();
    pos.height = scanBox.height();
    return scanBox[0].getBoundingClientRect();
}
function updatehtmlScreen() {
    htmlScreen.w = document.documentElement.clientWidth;
    htmlScreen.h = document.documentElement.clientHeight;
    container.css({ width: htmlScreen.w + 'px', height: htmlScreen.h + 'px' });
}


function modalDisplaySwitch() {
    mouseDownOnContainer = false;
    initReco();
    scanBox.css({ top: '-10px', left: '-10px', width: 0, height: 0 });
    if (container.is(':visible')) {
        container.hide();
        $("body").enableScroll();

        setTimeout(function () {
            $(document).unbind("contextmenu", disableDefaultEvt);
        }, 200);

    } else {
        container.show();
        $("body").disableScroll();
        $(document).bind("contextmenu", disableDefaultEvt);
    }
}



initModal();