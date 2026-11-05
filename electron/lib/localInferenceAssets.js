const path = require('path');

function pickBinaryAssetForPlatform({
    platform,
    arch,
    zipNames,
    preferredBackend = 'vulkan',
}) {
    const isSdCliZip = (name) => name.startsWith('sd-master-') || name.includes('-bin-');
    const candidates = zipNames.filter(isSdCliZip);

    if (platform === 'darwin') {
        if (arch !== 'arm64') return null;
        return candidates.find((name) => name.includes('Darwin') && name.includes('arm64')) || null;
    }

    if (platform === 'win32') {
        if (arch !== 'x64') return null;

        const winCandidates = candidates.filter((name) =>
            /win-(cpu|vulkan|rocm(?:-[\d.]+)?|cuda12|cu12|avx2?|avx512|noavx)-x64/i.test(name)
        );

        const backendMatchers = {
            vulkan: [/win-vulkan-x64/i],
            rocm: [/win-rocm-.*-x64/i],
            cuda: [/win-(?:cuda12|cu12)-x64/i],
            cpu: [
                /win-cpu-x64/i,
                /win-avx2-x64/i,
                /win-avx-x64/i,
                /win-avx512-x64/i,
                /win-noavx-x64/i,
            ],
        };

        const fallbackOrder = ['vulkan', 'rocm', 'cpu', 'cuda'];
        const order = [
            preferredBackend,
            ...fallbackOrder.filter((backend) => backend !== preferredBackend),
        ];

        for (const backend of order) {
            const matchers = backendMatchers[backend] || [];
            for (const matcher of matchers) {
                const hit = winCandidates.find((name) => matcher.test(name));
                if (hit) return hit;
            }
        }
        return null;
    }

    if (platform === 'linux' && arch === 'arm64') {
        const linuxArmCandidates = candidates.filter((name) =>
            name.includes('Linux') && (name.includes('aarch64') || name.includes('arm64'))
        );
        const plain = linuxArmCandidates.find((name) => !name.includes('rocm') && !name.includes('vulkan'));
        return plain
            || linuxArmCandidates.find((name) => name.includes('vulkan'))
            || linuxArmCandidates.find((name) => name.includes('rocm'))
            || null;
    }

    const linuxCandidates = candidates.filter((name) => name.includes('Linux') && name.includes('x86_64'));
    const plain = linuxCandidates.find((name) => !name.includes('rocm') && !name.includes('vulkan'));
    return plain
        || linuxCandidates.find((name) => name.includes('vulkan'))
        || linuxCandidates.find((name) => name.includes('rocm'))
        || null;
}

function getBundledBinaryResourceDir({ resourcesPath, platform, arch }) {
    const pathLib = platform === 'win32' ? path.win32 : path.posix;
    return pathLib.join(resourcesPath, 'local-ai', `${platform}-${arch}`, 'bin');
}

module.exports = {
    getBundledBinaryResourceDir,
    pickBinaryAssetForPlatform,
};
