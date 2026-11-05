const test = require('node:test');
const assert = require('node:assert/strict');

const {
    pickBinaryAssetForPlatform,
    getBundledBinaryResourceDir,
} = require('../electron/lib/localInferenceAssets');

test('pickBinaryAssetForPlatform prefers native linux arm64 assets', () => {
    const zipNames = [
        'sd-master-abc-bin-Linux-Ubuntu-24.04-x86_64.zip',
        'sd-master-abc-bin-Linux-Ubuntu-24.04-aarch64.zip',
        'sd-master-abc-bin-Linux-Ubuntu-24.04-aarch64-vulkan.zip',
    ];

    const picked = pickBinaryAssetForPlatform({
        platform: 'linux',
        arch: 'arm64',
        zipNames,
    });

    assert.equal(picked, 'sd-master-abc-bin-Linux-Ubuntu-24.04-aarch64.zip');
});

test('pickBinaryAssetForPlatform recognizes current Windows releases and prefers Vulkan', () => {
    const zipNames = [
        'sd-master-f5df5f8-bin-win-cpu-x64.zip',
        'sd-master-f5df5f8-bin-win-cuda12-x64.zip',
        'sd-master-f5df5f8-bin-win-rocm-10.1.0-x64.zip',
        'sd-master-f5df5f8-bin-win-vulkan-x64.zip',
    ];

    const picked = pickBinaryAssetForPlatform({
        platform: 'win32',
        arch: 'x64',
        zipNames,
    });

    assert.equal(picked, 'sd-master-f5df5f8-bin-win-vulkan-x64.zip');
});

test('pickBinaryAssetForPlatform honours an explicit Windows backend preference', () => {
    const zipNames = [
        'sd-master-f5df5f8-bin-win-cpu-x64.zip',
        'sd-master-f5df5f8-bin-win-cuda12-x64.zip',
        'sd-master-f5df5f8-bin-win-vulkan-x64.zip',
    ];

    assert.equal(
        pickBinaryAssetForPlatform({
            platform: 'win32',
            arch: 'x64',
            zipNames,
            preferredBackend: 'cpu',
        }),
        'sd-master-f5df5f8-bin-win-cpu-x64.zip'
    );

    assert.equal(
        pickBinaryAssetForPlatform({
            platform: 'win32',
            arch: 'x64',
            zipNames,
            preferredBackend: 'cuda',
        }),
        'sd-master-f5df5f8-bin-win-cuda12-x64.zip'
    );
});

test('getBundledBinaryResourceDir resolves linux arm64 bundled path', () => {
    const bundledDir = getBundledBinaryResourceDir({
        resourcesPath: '/opt/Open Generative AI/resources',
        platform: 'linux',
        arch: 'arm64',
    });

    assert.equal(
        bundledDir,
        '/opt/Open Generative AI/resources/local-ai/linux-arm64/bin'
    );
});
