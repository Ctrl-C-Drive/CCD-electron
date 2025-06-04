// ccd-main/state/cloudUploadState.js
let cloudUploadEnabled = false;

function getCloudUploadEnabled() {
  return cloudUploadEnabled;
}

function setCloudUploadEnabled(value) {
  cloudUploadEnabled = value;
}

function toggleCloudUploadEnabled() {
  cloudUploadEnabled = !cloudUploadEnabled;
}

module.exports = {
  getCloudUploadEnabled,
  setCloudUploadEnabled,
  toggleCloudUploadEnabled,
};
