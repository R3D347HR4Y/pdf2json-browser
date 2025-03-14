import { kColors, kFontFaces, kFontStyles } from "./lib/pdfconst.js";

import { EventEmitter } from "events";
import PDFJS from "./lib/pdf.js";
import { ParserStream } from "./lib/parserstream.js";
import nodeUtil from "util";

export default class PDFParser extends EventEmitter {
  // inherit from event emitter
  //public static
  static get colorDict() {
    return kColors;
  }
  static get fontFaceDict() {
    return kFontFaces;
  }
  static get fontStyleDict() {
    return kFontStyles;
  }

  //private static
  static #binBuffer = {};

  //private
  #password = "";

  #context = null; // service context object, only used in Web Service project; null in command line

  #pdfFilePath = null; //current PDF file to load and parse, null means loading/parsing not started
  #pdfFileMTime = null; // last time the current pdf was modified, used to recognize changes and ignore cache
  #data = null; //if file read success, data is PDF content; if failed, data is "err" object
  #PDFJS = null; //will be initialized in constructor

  // constructor
  constructor(context, needRawText, password) {
    //call constructor for super class
    super();

    // private
    // service context object, only used in Web Service project; null in command line
    this.#context = context;

    this.#pdfFilePath = null; //current PDF file to load and parse, null means loading/parsing not started
    this.#pdfFileMTime = null; // last time the current pdf was modified, used to recognize changes and ignore cache
    this.#data = null; //if file read success, data is PDF content; if failed, data is "err" object

    this.#PDFJS = new PDFJS(needRawText);
    this.#password = password;
  }

  //private methods, needs to invoked by [funcName].call(this, ...)
  #onPDFJSParseDataReady(data) {
    if (!data) {
      //v1.1.2: data===null means end of parsed data
      nodeUtil.p2jinfo("PDF parsing completed.");
      this.emit("pdfParser_dataReady", this.#data);
    } else {
      this.#data = { ...this.#data, ...data };
    }
  }

  #onPDFJSParserDataError(err) {
    this.#data = null;
    this.emit("pdfParser_dataError", { parserError: err });
    // this.emit("error", err);
  }

  #startParsingPDF(buffer) {
    this.#data = {};

    this.#PDFJS.on("pdfjs_parseDataReady", (data) =>
      this.#onPDFJSParseDataReady(data)
    );
    this.#PDFJS.on("pdfjs_parseDataError", (err) =>
      this.#onPDFJSParserDataError(err)
    );

    //v1.3.0 the following Readable Stream-like events are replacement for the top two custom events
    this.#PDFJS.on("readable", (meta) => this.emit("readable", meta));
    this.#PDFJS.on("data", (data) => this.emit("data", data));
    this.#PDFJS.on("error", (err) => this.#onPDFJSParserDataError(err));

    this.#PDFJS.parsePDFData(
      buffer || PDFParser.#binBuffer[this.binBufferKey],
      this.#password
    );
  }

  //public getter
  get data() {
    return this.#data;
  }
  get binBufferKey() {
    return this.#pdfFilePath + this.#pdfFileMTime;
  }

  //public APIs
  createParserStream() {
    return new ParserStream(this, { objectMode: true, bufferSize: 64 * 1024 });
  }

  // Introduce a way to directly process buffers without the need to write it to a temporary file
  parseBuffer(pdfBuffer) {
    this.#startParsingPDF(pdfBuffer);
  }

  getRawTextContent() {
    return this.#PDFJS.getRawTextContent();
  }
  getRawTextContentStream() {
    return ParserStream.createContentStream(this.getRawTextContent());
  }

  getAllFieldsTypes() {
    return this.#PDFJS.getAllFieldsTypes();
  }
  getAllFieldsTypesStream() {
    return ParserStream.createContentStream(this.getAllFieldsTypes());
  }

  getMergedTextBlocksIfNeeded() {
    return this.#PDFJS.getMergedTextBlocksIfNeeded();
  }
  getMergedTextBlocksStream() {
    return ParserStream.createContentStream(this.getMergedTextBlocksIfNeeded());
  }

  destroy() {
    // invoked with stream transform process
    super.removeAllListeners();

    //context object will be set in Web Service project, but not in command line utility
    if (this.#context) {
      this.#context.destroy();
      this.#context = null;
    }

    this.#pdfFilePath = null;
    this.#pdfFileMTime = null;
    this.#data = null;

    this.#PDFJS.destroy();
    this.#PDFJS = null;
  }
}
