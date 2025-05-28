// src/modules/CloudDataModule.js
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

class CloudDataModule {
  constructor(config) {
    this.apiBaseURL = config.apiBaseURL;
    this.tokenStorage = {
      accessToken: config.authToken || null,
      refreshToken: config.refreshToken || null,
    };
    this.isRefreshing = false;
    this.refreshSubscribers = [];

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
            throw {
              code: "E401",
              message: "세션이 만료되었습니다. 다시 로그인 해주세요.",
            };
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
      return response.data;
    } catch (error) {
      console.error("Login failed:", error.response?.data || error);
      throw { code: "E401", message: "로그인 실패" };
    }
  }

  // 로그아웃 메서드 추가
  logout() {
    this.tokenStorage = { accessToken: null, refreshToken: null };
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
      throw error;
    }
  }
  async signup(userData) {
    try {
      const response = await this.axiosInstance.post("/signup", userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error, "회원가입 실패");
    }
  }

  // 클립보드 데이터 조회
  async getClipboardData() {
    try {
      const response = await this.axiosInstance.get("/clipboard-data");
      return response.data.map((item) => this.transformItem(item));
    } catch (error) {
      throw this.handleError(error, "데이터 조회 실패");
    }
  }
  // 클립보드 텍스트 생성
  async createTextItem(itemData) {
    try {
      const response = await this.axiosInstance.post("/items", {
        ...itemData,
      });
      return this.transformItem(response.data);
    } catch (error) {
      throw this.handleError(error, "아이템 생성 실패");
    }
  }

  // 공유 데이터 중 로컬 데이터 삭제 시 알려줘
  async localDelete(itemId) {
    try {
      const response = await this.axiosInstance.post("/items/localDelete", {
        item_id: itemId,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, "삭제 처리 실패");
    }
  }

  //클립보드 데이터 삭제
  async deleteItem(itemId) {
    try {
      await this.axiosInstance.delete(`/items/${itemId}`);
      return true;
    } catch (error) {
      throw this.handleError(error, "아이템 삭제 실패");
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
      throw this.handleError(error, "태그 생성 실패");
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
      throw this.handleError(error, "태그 연결 실패");
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
      throw this.handleError(error, "아이템 조회 실패");
    }
  }

  // 공통 에러 처리
  handleError(error, defaultMessage) {
    console.error(error);
    const statusCode = error.response?.status;
    const serverMessage = error.response?.data?.detail;

    return {
      code: `E${statusCode || "500"}`,
      message: serverMessage || defaultMessage,
      details: error.response?.data,
    };
  }

  // 아이템 데이터 변환
  transformItem(item) {
    return {
      ...item,
      imageMeta: item.image_meta
        ? {
            ...item.image_meta,
            originalUrl: `${this.apiBaseURL}${item.image_meta.file_path}`,
            thumbnailUrl: `${this.apiBaseURL}${item.image_meta.thumbnail_path}`,
          }
        : null,
      tags: item.tags || [],
    };
  }

  // 이미지 업로드
  async uploadImage(id, filePath, format, created_at) {
    if (!fs.existsSync(filePath)) {
      throw {
        code: "E400",
        message: "이미지 파일이 존재하지 않습니다.",
      };
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
      throw this.handleError(error, "이미지 업로드 실패");
    }
  }

  // Clip 검색 함수
  async searchByCLIP(keyword) {
    try {
      const response = await this.axiosInstance.post("/search-text", {
        text: keyword,
      });

      return response.data.map((item) => this.transformItem(item));
    } catch (error) {
      throw this.handleError(error, "CLIP 검색 실패");
    }
  }
}

module.exports = CloudDataModule;
