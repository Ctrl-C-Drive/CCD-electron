// src/modules/CloudDataModule.js
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

class CloudDataModule {
  constructor(config) {
    this.apiBaseURL = config.apiBaseURL; // ex: http://your-fastapi-host:8000
    this.authToken = config.authToken; // JWT 토큰
  }

  // 공통으로 사용할 헤더를 설정합니다.
  _getHeaders() {
    return {
      Authorization: `Bearer ${this.authToken}`,
      "Content-Type": "application/json",
    };
  }

  // 데이터 생성
  async create(tableName, data) {
    try {
      const payload = {
        tableName: tableName,
        data: {
          id: data.id || uuidv4(), // id가 없으면 새로 생성
          ...data,
        },
      };

      const res = await axios.post(`${this.apiBaseURL}/create`, payload, {
        headers: this._getHeaders(),
      });

      return res.data; // 응답 데이터 반환
    } catch (err) {
      console.error("Cloud Create Error:", err?.response?.data || err);
      throw { code: "E654", message: "클라우드 데이터 생성 실패" };
    }
  }

  // 데이터 조회
  async read(tableName, condition = {}) {
    try {
      const payload = {
        tableName: tableName,
        condition: condition,
      };

      const res = await axios.post(`${this.apiBaseURL}/read`, payload, {
        headers: this._getHeaders(),
      });

      return res.data.rows || []; // 조회된 결과 반환
    } catch (err) {
      console.error("Cloud Read Error:", err?.response?.data || err);
      throw { code: "E655", message: "클라우드 데이터 조회 실패" };
    }
  }

  // 데이터 수정
  async update(tableName, condition, data) {
    try {
      const payload = {
        tableName: tableName,
        condition: condition,
        data: data,
      };

      const res = await axios.post(`${this.apiBaseURL}/update`, payload, {
        headers: this._getHeaders(),
      });

      return res.data; // 수정된 데이터 반환
    } catch (err) {
      console.error("Cloud Update Error:", err?.response?.data || err);
      throw { code: "E656", message: "클라우드 데이터 수정 실패" };
    }
  }

  // 데이터 삭제
  async delete(tableName, condition) {
    try {
      const payload = {
        tableName: tableName,
        condition: condition,
      };

      const res = await axios.post(`${this.apiBaseURL}/delete`, payload, {
        headers: this._getHeaders(),
      });

      return res.data.deleted || 0; // 삭제된 행 수 반환
    } catch (err) {
      console.error("Cloud Delete Error:", err?.response?.data || err);
      throw { code: "E650", message: "클라우드 데이터 삭제 실패" };
    }
  }
}

module.exports = CloudDataModule;
