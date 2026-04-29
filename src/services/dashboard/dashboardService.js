import axiosInstance from "../../plugins/axiosConfig";

const dashboardService = {
  async analytics(params = {}) {
    const { data } = await axiosInstance.get("/dashboard/analytics", {
      params,
    });
    return data;
  },
};

export default dashboardService;
