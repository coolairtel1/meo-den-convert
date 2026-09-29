import * as Comlink from "comlink"
import { convertImage } from "@/lib/engine/pipeline"

const api = { convertImage }

export type ConvertWorkerApi = typeof api

Comlink.expose(api)
