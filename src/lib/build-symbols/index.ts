import * as fs from 'fs';
import path from 'path';
import logger from '../script/logger';
import {bash} from '../script/utils';
import {getFilesizeInBytes} from '../script/utils';
import {formatSvgPaths} from '../../utils';

interface IArgs {
    path: string,
    idPrefix?: string
}


/**
 * reg: https://regex101.com/r/ai3qvO/1
 */
async function run(args: IArgs) {
    const basePath = typeof args.path !== 'undefined' ? args.path: './';
    const sourceDirPath = path.join(basePath, '_sources');
    const idPrefix = typeof args.idPrefix !== 'undefined' ? args.idPrefix: 'icon_';

    logger.info(`svg merge symbols ${basePath} ...`);

    const symbol: string[] = [];
    const iconCodes: string[] = [];

    const dirChildFiles = fs.readdirSync(sourceDirPath);

    const targetSvgFile = path.join(basePath, 'index.svg');
    const targetTsTypeFile = path.join(basePath, 'db.d.ts');
    const targetDartTypeFile = path.join(basePath, 'db.dart');

    dirChildFiles.forEach(file => {
        if (path.extname(file) == '.svg'){
            const filename = file.replace('.svg', '');
            const iconCode = [idPrefix, filename].join('');

            const svgContent = fs
                .readFileSync(path.join(sourceDirPath, file), {encoding:'utf8', flag:'r'})
                .toString();

            const svgPaths = formatSvgPaths(svgContent);

            symbol.push(`  <symbol id="${iconCode}">\n${svgPaths.paths.join('\n')}\n  </symbol>`);
            iconCodes.push(`${filename}`);
        }

    });

    // write file
    fs.writeFileSync(targetSvgFile, `<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">\n
${symbol.join('\n\n')}\n
</svg>`);
    logger.success(`Build to ${targetSvgFile}, size: ${getFilesizeInBytes(targetSvgFile)}`);


    // ========= write typescript type file =========
    fs.writeFileSync(targetTsTypeFile, `
declare type TIconCode = ${iconCodes.map(code => `'${code}'`).join('|')};
declare enum EIconCode {
  ${iconCodes.map(code => `'${code}'='${code}'`).join(',\n  ')}
}
export {TIconCode, EIconCode}
`);
    logger.success(`Build to ${targetTsTypeFile}, size: ${getFilesizeInBytes(targetTsTypeFile)}`);


    // ========= write dart flutter type file =========
    const varName = 'Map<EIconCode, String> iconCodeMapping';
    fs.writeFileSync(targetDartTypeFile, `
enum EIconCode {
  ${iconCodes.join(',\n  ')}
}

${varName} = {
  ${iconCodes.map(code => {
        return `EIconCode.${code}: '${code}',`;
    }).join('\n  ')}
};


`);
    logger.success(`Build to ${targetDartTypeFile}, size: ${getFilesizeInBytes(targetDartTypeFile)}`);


    // By OSX Notice
    bash(`osascript -e 'display notification "${basePath} done" with title "publish done"'`);
}

export default run;
module.exports = run;
