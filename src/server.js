const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.url === "/health") {
    console.log(`Health check request received`);
    res.end(JSON.stringify({
      status: "success"
    }));
    return;
  }

  if (req.url === "/") {
    console.log(`Root request received`);
    res.end(JSON.stringify({
      message: "Hello from Docker!",
      version: "2.0.0"
    }));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({
    error: "Not Found"
  }));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
