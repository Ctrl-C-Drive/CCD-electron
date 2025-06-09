// src/modules/CloudDataModule.js
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const CCDError = require("../CCDError");
require("dotenv").config();
const notifyRenderer = require("../notifyRenderer");

const config = {
  apiBaseURL: process.env.CLOUD_SERVER_URL,
  authToken: null,
  refreshToken: null,
};

class CloudDataModule {
  constructor(config) {
    this.apiBaseURL = config.apiBaseURL;
    this.tokenStorage = {
      accessToken: config.authToken || null,
      refreshToken: config.refreshToken || null,
    };
    this.isRefreshing = false;
    this.refreshSubscribers = [];
    this.localDB = require("./LocalData");

    // Axios 인스턴스 생성
    this.axiosInstance = axios.create({
      baseURL: this.apiBaseURL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // 요청 인터셉터 설정
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        if (this.tokenStorage.accessToken) {
          config.headers.Authorization = `Bearer ${this.tokenStorage.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 응답 인터셉터 설정 (토큰 갱신 처리)
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.refreshSubscribers.push(() => {
                originalRequest.headers.Authorization = `Bearer ${this.tokenStorage.accessToken}`;
                resolve(this.axiosInstance(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newTokens = await this.refreshAccessToken();
            this.tokenStorage.accessToken = newTokens.access_token;
            this.tokenStorage.refreshToken = newTokens.refresh_token;

            this.refreshSubscribers.forEach((cb) => cb());
            this.refreshSubscribers = [];

            originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
            this.logout();
            throw CCDError.create("E610", {
              module: "CloudData",
              context: "토큰 갱신 실패",
              message: "세션이 만료되었습니다. 다시 로그인 해주세요.",
            });
          } finally {
            this.isRefreshing = false;
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // 토큰 저장소 업데이트
  updateTokenStorage(tokens) {
    this.tokenStorage = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
  }
  // 로그인 메서드
  async login(credentials) {
    try {
      const response = await axios.post(
        `${this.apiBaseURL}/login`,
        credentials
      );
      console.log("sent");
      this.updateTokenStorage({
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
      });
      await this.processPendingSync();
      notifyRenderer("clipboard-updated");
      console.log("login finished", response.data);
      return response.data;
    } catch (error) {
      console.error("Login failed:", error.response?.data || error);
      throw CCDError.create("E610", {
        module: "CloudData",
        context: "로그인 요청 실패",
        message: error.response?.data?.detail || "로그인 실패",
      });
    }
  }

  // 로그아웃 메서드 추가
  logout() {
    this.tokenStorage = { accessToken: null, refreshToken: null };
  }
  async processPendingSync() {
    const items = this.localDB.getPendingSyncItems();

    for (const item of items) {
      try {
        const args = item.op_args ? JSON.parse(item.op_args) : {};

        switch (item.op) {
          case "localDelete":
            await this.localDelete(item.data_id, "cloud");
            break;
          case "delete":
            await this.deleteItem(item.data_id);
            break;
          case "updateMaxCount":
            await this.updateMaxCountCloud(args.limit);
            break;
          // 여기에 다른 op도 확장 가능
        }

        this.localDB.clearPendingItem(item.id);
      } catch (err) {
        console.warn(`pendingSync 실패: id=${item.id}, op=${item.op}`, err);
      }
    }
  }

  // 토큰 갱신 메서드
  async refreshAccessToken() {
    try {
      const response = await axios.post(`${this.apiBaseURL}/refresh`, {
        refresh_token: this.tokenStorage.refreshToken,
      });
      return response.data;
    } catch (error) {
      console.error("Token refresh failed:", error.response?.data || error);
      throw CCDError.create("E610", {
        module: "CloudData",
        context: "토큰 갱신",
        message: "토큰 갱신 실패",
        details: error.response?.data,
      });
    }
  }
  async signup(userData) {
    try {
      const response = await this.axiosInstance.post("/signup", userData);
      return response.data;
    } catch (error) {
      throw CCDError.create("E610", {
        module: "CloudData",
        context: "회원가입",
        message: error.response?.data?.detail || "회원가입 실패",
      });
    }
  }

  // 클립보드 데이터 조회
  async getClipboardData() {
    try {
      const response = await this.axiosInstance.get("/clipboard-data", {
        headers: { "Cache-Control": "no-cache" },
      });

      return response.data.map((item) => this.transformItem(item));
    } catch (error) {
      throw CCDError.create("E655", {
        module: "CloudData",
        context: "클립보드 데이터 조회",
        message: "데이터 조회 실패",
        details: error.response?.data,
      });
    }
  }
  // 클립보드 텍스트 생성
  async createTextItem(itemData) {
    try {
      const payload = {
        ...itemData,
      };
      const response = await this.axiosInstance.post("/items", payload);
      return this.transformItem(response.data);
    } catch (error) {
      throw CCDError.create("E654", {
        module: "CloudData",
        context: "텍스트 아이템 생성",
        message: error.detail,
        details: error.response?.data,
      });
    }
  }

  // 공유 데이터 중 로컬 데이터 삭제 시 알려줘
  async localDelete(itemId, shared) {
    try {
      const response = await this.axiosInstance.post("/items/localDelete", {
        item_id: itemId,
        shared: shared,
      });
      return response.data;
    } catch (error) {
      throw CCDError.create("E650", {
        module: "CloudData",
        context: "로컬 삭제",
        message: "삭제 처리 실패",
        details: error.response?.data,
      });
    }
  }

  //클립보드 데이터 삭제
  async deleteItem(itemId) {
    try {
      await this.axiosInstance.delete(`/items/${itemId}`);
      return true;
    } catch (error) {
      throw CCDError.create("E650", {
        module: "CloudData",
        context: "아이템 삭제",
        message: "아이템 삭제 실패",
        details: error.response?.data,
      });
    }
  }
  // 태그 생성
  async createTag(tagData) {
    try {
      const response = await this.axiosInstance.post("/tags", {
        tag_id: uuidv4(),
        ...tagData,
      });
      return response.data;
    } catch (error) {
      throw CCDError.create("E661", {
        module: "CloudData",
        context: "태그 생성",
        message: "태그 생성 실패",
        details: error.response?.data,
      });
    }
  }

  // 데이터-태그 연결
  async createDataTag(dataId, tagId) {
    try {
      const response = await this.axiosInstance.post("/data-tags", {
        data_id: dataId,
        tag_id: tagId,
      });
      return response.data;
    } catch (error) {
      throw CCDError.create("E662", {
        module: "CloudData",
        context: "데이터-태그 연결",
        message: "태그 연결 실패",
        details: error.response?.data,
      });
    }
  }

  // 단일 아이템 조회
  async getClipboardItem(dataId) {
    try {
      const response = await this.axiosInstance.get(
        `/clipboard-data/${dataId}`
      );
      return this.transformItem(response.data);
    } catch (error) {
      throw CCDError.create("E655", {
        module: "CloudData",
        context: "단일 아이템 조회",
        message: "아이템 조회 실패",
        details: error.response?.data,
      });
    }
  }

  // 아이템 데이터 변환
  // CloudData.js ── replace transformItem()
  transformItem(item) {
    const base = this.apiBaseURL;

    const tagNames =
      item.tags && item.tags.length
        ? item.tags.map((t) => t.name)
        : item.tag_names
        ? item.tag_names.split(",")
        : [];

    // ② 이미지 전용 절대 경로 생성
    const makeUrl = (p) => (p && !p.startsWith("http") ? `${base}${p}` : p);

    const imageMeta = item.image_meta
      ? {
          ...item.image_meta,
          originalUrl: makeUrl(item.image_meta.file_path),
          thumbnailUrl: makeUrl(item.image_meta.thumbnail_path),
        }
      : null;

    // ③ content(이미지)도 절대 경로로 치환
    const content =
      item.type === "img"
        ? makeUrl(item.file_path || item.content)
        : item.content;

    return {
      id: item.id,
      type: item.type,
      format: item.format,
      content,
      created_at: item.created_at,
      shared: item.shared || "cloud",
      tags: tagNames,
      imageMeta,
    };
  }

  // 이미지 업로드
  async uploadImage(id, filePath, format, created_at) {
    if (!fs.existsSync(filePath)) {
      throw CCDError.create("E643", {
        module: "CloudData",
        context: "이미지 파일 존재 확인",
        message: "이미지 파일이 존재하지 않습니다.",
      });
    }
    try {
      const formData = new FormData();
      const fileStream = fs.createReadStream(filePath);

      formData.append("file", fileStream);
      formData.append("id", id);
      formData.append("format", format);
      formData.append("created_at", created_at);

      const response = await this.axiosInstance.post("/items/image", formData, {
        headers: formData.getHeaders(),
      });

      return {
        ...response.data,
        imageUrl: `${this.apiBaseURL}/images/original/${id}.${format}`,
        thumbnailUrl: `${this.apiBaseURL}/images/thumbnail/${id}_thumb.${format}`,
      };
    } catch (error) {
      throw CCDError.create("E632", {
        module: "CloudData",
        context: "이미지 업로드",
        message: "이미지 업로드 실패",
        details: error.response?.data,
      });
    }
  }

  // Clip 검색 함수
  async searchByCLIP(keyword) {
    try {
      const response = await this.axiosInstance.post("/search-text", {
        query: keyword,
      });

      return response.data.map((item) => this.transformItem(item));
    } catch (error) {
      throw CCDError.create("E621", {
        module: "CloudData",
        context: "CLIP 검색",
        message: "CLIP 검색 실패",
        details: error.response?.data,
      });
    }
  }
  async updateMaxCountCloud(maxCount) {
    try {
      const response = await this.axiosInstance.put("/user/max_count_cloud", {
        max_count_cloud: maxCount,
      });
      return response.data;
    } catch (error) {
      const errorData = error.response?.data || {};
      const errorMsg =
        errorData.detail || "Failed to update cloud storage limit";

      throw CCDError.create("E610", {
        module: "CloudData",
        context: "updateMaxCountCloud",
        message: errorMsg,
        details: errorData,
        statusCode: error.response?.status,
      });
    }
  }
}

const cloudDataInstance = new CloudDataModule(config);
module.exports = cloudDataInstance;
