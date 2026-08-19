// Wraps app.json so a subpath base URL can be injected only for builds that
// need it (e.g. deploying the web export under github.io/<repo>/app/),
// without touching local dev (localhost:8081 stays served at "/").
module.exports = ({ config }) => {
  const basePath = process.env.TANKY_BASE_PATH;
  if (basePath) {
    config.experiments = { ...config.experiments, baseUrl: basePath };
  }
  return config;
};
