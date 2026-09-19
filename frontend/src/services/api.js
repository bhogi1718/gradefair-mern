import axios from "axios";

export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const API = axios.create({ baseURL: API_URL, timeout: 15000 });

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// Expired / invalid token → drop the session and bounce to login once.
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("gradefair:logout"));
    }
    return Promise.reject(err);
  }
);

/** Pull a human readable message out of an axios error. */
export const errMsg = (err, fallback = "Something went wrong") => {
  if (err?.code === "ERR_NETWORK") return "Cannot reach the server. Is the backend running?";
  return err?.response?.data?.msg || err?.message || fallback;
};

export default API;
