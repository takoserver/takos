import express from "npm:express"
import { createProxyMiddleware } from "npm:http-proxy-middleware"
import type { NextFunction, Request, Response } from "npm:express"
import type { Filter, Options, RequestHandler } from "npm:http-proxy-middleware"

const app = express()

const proxyMiddleware = createProxyMiddleware<Request, Response>({
  target: "http://localhost:5000",
  changeOrigin: true,
})

const proxyMiddleware2 = createProxyMiddleware<Request, Response>({
  target: "http://localhost:8000",
  changeOrigin: true,
})

app.use("/takos", proxyMiddleware)
app.use("/", proxyMiddleware2)

app.listen(4000, () => {
  console.log("Server is running on port 4000")
})
