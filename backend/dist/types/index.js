"use strict";
// src/types/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMessages = void 0;
var ErrorMessages;
(function (ErrorMessages) {
    ErrorMessages["SALE_NOT_STARTED"] = "Sale has not started yet";
    ErrorMessages["SALE_ENDED"] = "Sale has ended";
    ErrorMessages["SOLD_OUT"] = "Product is sold out";
    ErrorMessages["ALREADY_PURCHASED"] = "You have already purchased this item";
    ErrorMessages["INVALID_USER_ID"] = "Invalid user ID provided";
    ErrorMessages["SYSTEM_ERROR"] = "System error occurred. Please try again";
})(ErrorMessages || (exports.ErrorMessages = ErrorMessages = {}));
