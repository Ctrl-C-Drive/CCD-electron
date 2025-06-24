require("dotenv").config();

const CloudDataModule = require("./CloudData");
const DataRepositoryModule = require("./DataRepository");

const cloudData = new CloudDataModule({
  apiBaseURL: process.env.CLOUD_SERVER_URL,
  authToken: null,
  refreshToken: null,
});
const dataRepo = new DataRepositoryModule();

cloudData.setDataRepository(dataRepo);
dataRepo.setCloudData(cloudData);

module.exports = { cloudData, dataRepo };
