function captureScreen(id) {
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 100 }, function (dataUri) {
        chrome.tabs.sendMessage(id, { 'data': dataUri }, function (response) {
            console.log(response.status);
        });
    });
}

chrome.action.onClicked.addListener((tab) => {
    captureScreen(tab.id);
});
