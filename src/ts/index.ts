import * as path from 'path';
import * as fs from 'fs';

const Datauri = require('datauri');
const url = require('rework-plugin-url');

/**
 *  Enum that decides what action to take if a problem is detected.
 */
export enum Action {
    /** Ignore the error and continue */
    IGNORE = '',
    /** Warn about the error and continue */
    WARN = 'warn',
    /** Warn about the error and break */
    ERROR = 'error'
};

/**
 * Options that are passed to base64
 */
export interface Options {
    /** Decides which URLs to encode. Anything that is matched by a regexp in the include array will be converted  */
    include: RegExp[];
    /** Decides which URLs to encode. Anything that is matched by a regexp in the exclude array will not be converted */
    exclude: RegExp[];
    /** Only images which are smaller than `maxImageSize` after they are encoded will be inlined */
    maxImageSize: number;
    /** Maximum number of warnings that should be reported */
    maxReported: number;

    /** Decides what to do if an image file is not found */
    actOnMissingFile: Action;
    /** Decides what to do if an image is found that is too big */
    actOnLargeFile: Action;
    /** Decodes what to do if the same image is encoded more than once */
    actOnEncodedTwice: Action;
};

export function base64(baseDir: string, options: Options) {
    var opts: Options = Object.assign({
        include: [],
        exclude: [ /.*/ ],
        maxImageSize: 8192,
        maxReported: 10,

        actOnMissingFile: 'error',
        actOnLargeFile: 'warn',
        actOnEncodedTwice: 'warn'
    }, options);

    let cache: { [url: string]: string } = {};
    let reported = 0;

    function error(value: string, action: Action, url: string, msg: string) {
        msg = 'Image file ' + url + ' ' + msg;

        if (action === 'error') {
            console.error(msg);
            throw new Error(msg);
        } else if (action === 'warn') {
            if (reported++ < opts.maxReported) {
                console.warn(msg);
            }
        }
        return value;
    }

    function matches(url: string): boolean {
        return !url.startsWith('data:') &&
            (opts.include.some(re => !!url.match(re)) || !opts.exclude.some(re => !!url.match(re)));
    }

    return url(function (url: string) {
        if (matches(url)) {
            if (cache[url]) {
                return error(cache[url], opts.actOnEncodedTwice, url, "is encoded more than once")
            } else {
                let file = path.resolve(baseDir, url);

                if (fs.existsSync(file)) {
                    let data = new Datauri(file);

                    if (data.content.length < opts.maxImageSize) {
                        cache[url] = data.content;
                        return data.content;
                    } else {
                        return error(url, opts.actOnLargeFile, url, 'is too large');
                    }
                } else {
                    return error(url, opts.actOnMissingFile, url, 'is missing');
                }
            }
        } else {
            return url;
        }
    });
}
