/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "node-fetch";
import fetch from "node-fetch";
import HttpProxyAgent from "http-proxy-agent";
import HttpsProxyAgent from "https-proxy-agent";
import fs from "fs";
import { createReadStream } from "fs";
import util from "util";
import stream from "stream";

const streamPipeline = util.promisify(stream.pipeline);

class FetchWrapper {
    public async getJSON(
        url: string,
        options?: any,
        proxy?: { proxyProtocol: string; proxyIpAddress: string; proxyPort: number }
    ) {
        return this.get(url, options, proxy, (resp) => resp.json());
    }

    public async getText(
        url: string,
        options?: any,
        proxy?: { proxyProtocol: string; proxyIpAddress: string; proxyPort: number }
    ) {
        return this.get(url, options, proxy, (resp) => resp.text());
    }

    public async getTextConverted(
        url: string,
        options?: any,
        proxy?: { proxyProtocol: string; proxyIpAddress: string; proxyPort: number }
    ) {
        return this.get(url, options, proxy, (resp) => resp.textConverted());
    }

    public async getBuffer(
        url: string,
        options?: any,
        proxy?: { proxyProtocol: string; proxyIpAddress: string; proxyPort: number }
    ) {
        return this.get(url, options, proxy, (resp) => resp.buffer());
    }

    public async getArrayBuffer(
        url: string,
        options?: any,
        proxy?: { proxyProtocol: string; proxyIpAddress: string; proxyPort: number }
    ) {
        return this.get(url, options, proxy, (resp) => resp.arrayBuffer());
    }

    public async getBlob(
        url: string,
        options?: any,
        proxy?: { proxyProtocol: string; proxyIpAddress: string; proxyPort: number }
    ) {
        return this.get(url, options, proxy, (resp) => resp.blob());
    }

    public async download(
        url: string,
        filePath: string,
        options?: any,
        proxy?: { proxyProtocol: string; proxyIpAddress: string; proxyPort: number }
    ) {
        try {
            const result = await this.get(url, options, proxy);
            await streamPipeline(result.data, fs.createWriteStream(filePath));
            Promise.resolve(result);
        } catch (err) {
            Promise.reject({ statusText: err.message });
        }
    }

    public async uploadFile(url: string, filePath: string, method: "POST" | "PUT" | "PATCH", options?: any) {
        return this.putOrPostOrPatchOrDelete(url, method, options, createReadStream(filePath));
    }

    public async put(
        url: string,
        options?: any,
        data?: ArrayBuffer | ArrayBufferView | NodeJS.ReadableStream | string | URLSearchParams | FormData,
        proxy?: { proxyProtocol: string; proxyIpAddress: string; proxyPort: number }
    ) {
        return this.putOrPostOrPatchOrDelete("PUT", url, options, data, proxy);
    }

    public async post(
        url: string,
        options?: any,
        data?: ArrayBuffer | ArrayBufferView | NodeJS.ReadableStream | string | URLSearchParams | FormData,
        proxy?: { proxyProtocol: string; proxyIpAddress: string; proxyPort: number }
    ) {
        return this.putOrPostOrPatchOrDelete("POST", url, options, data, proxy);
    }

    public async patch(
        url: string,
        options?: any,
        data?: ArrayBuffer | ArrayBufferView | NodeJS.ReadableStream | string | URLSearchParams | FormData,
        proxy?: { proxyProtocol: string; proxyIpAddress: string; proxyPort: number }
    ) {
        return this.putOrPostOrPatchOrDelete("PATCH", url, options, data, proxy);
    }

    //FIXME: поменять местами формдата и опции
    //FIXME:хидер верный?
    public async postForm(
        url: string,
        formData: FormData,
        options?: any,
        proxy?: { proxyProtocol: string; proxyIpAddress: string; proxyPort: number }
    ) {
        options.headers = {
            ...options.headers,
            ...{
                "Content-Type": "application/json",
            },
        };
        return this.putOrPostOrPatchOrDelete("POST", url, { ...options }, formData, proxy);
    }

    public async delete(
        url: string,
        options?: any,
        data?: ArrayBuffer | ArrayBufferView | NodeJS.ReadableStream | string | URLSearchParams | FormData,
        proxy?: { proxyProtocol: string; proxyIpAddress: string; proxyPort: number }
    ) {
        return this.putOrPostOrPatchOrDelete("DELETE", url, options, data, proxy);
    }

    public async get(
        url: string,
        options?: any,
        proxy?: { proxyProtocol: string; proxyIpAddress: string; proxyPort: number },
        getDataFn?: (response: Response) => any
    ) {
        const res = this.doFetch(url, { ...options, ...{ method: "GET" } }, proxy);
        return this.processRequest(res, getDataFn);
    }

    private putOrPostOrPatchOrDelete(
        method: string,
        url: string,
        options?: any,
        data?: ArrayBuffer | ArrayBufferView | NodeJS.ReadableStream | string | URLSearchParams | FormData,
        proxy?: { proxyProtocol: string; proxyIpAddress: string; proxyPort: number }
    ) {
        const reqData = !!data && Object(data) === data ? JSON.stringify(data) : data;
        const mergedOptions = { ...options, ...{ method }, ...{ body: reqData } };

        mergedOptions.headers = {
            ...mergedOptions.headers,
            ...{
                "content-type": "application/json; charset=utf-8",
            },
        };

        const res = this.doFetch(url, mergedOptions, proxy);
        return this.processRequest(res, (resp) => resp.json());
    }

    private doFetch(
        url: string,
        options?: any,
        proxy?: { proxyProtocol: string; proxyIpAddress: string; proxyPort: number }
    ): Promise<Response> {
        const defaultOptions: any = {
            timeout: 5000,
            follow: 9,
        };

        const requestOptions = { ...defaultOptions, ...options };

        if (!!proxy) {
            const proxyProtocol = proxy.proxyProtocol || "http";
            const proxyUri = `${proxyProtocol}://${proxy.proxyIpAddress}:${proxy.proxyPort}`;
            const agent = url.toLowerCase().startsWith("https")
                ? new HttpsProxyAgent.HttpsProxyAgent(proxyUri)
                : new HttpProxyAgent.HttpProxyAgent(proxyUri);
            requestOptions.agent = agent;
            requestOptions.agent.timeout = requestOptions.timeout;
        }

        const res = fetch(url, requestOptions);

        return res;
    }

    // FIXME:надо нормальное сообщение сделать при ошибке, см. клиент
    private async processRequest(
        fetchResult: Promise<Response>,
        getDataFn?: (response: Response) => any
    ): Promise<{ data: any; status: number; statusText: string; headers: Headers }> {
        const response: any = {};
        try {
            const result = await fetchResult;

            try {
                response.data = !!getDataFn && result.status != 204 ? await getDataFn(result) : {};
            } catch (err) {
                response.data = { dataError: err };
            }

            response.status = result.status;
            response.statusText = result.statusText;
            response.headers = result.headers.raw();

            if (result.status > 399) {
                return Promise.reject(response);
            }
            return Promise.resolve(response);
        } catch (err) {
            response.status = response.status;
            response.statusText = err.message;
            return Promise.reject(response);
        }
    }
}

export const fetchWrapper = new FetchWrapper();
