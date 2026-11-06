const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'cloud', 'free-video');

test('free cloud video notebook is valid and starts the checked-in launcher', () => {
    const notebook = JSON.parse(fs.readFileSync(path.join(root, 'NAFRI_OGA_Free_Video_Colab.ipynb'), 'utf8'));
    const source = notebook.cells.flatMap(cell => cell.source || []).join('');
    assert.equal(notebook.nbformat, 4);
    assert.match(source, /torch\.cuda\.is_available/);
    assert.match(source, /cloud\/free-video\/launch_colab\.py/);
    assert.match(source, /NAFR-IA\/Open-Generative-AI/);
});

test('free cloud worker implements the MCP tools consumed by the desktop app', () => {
    const worker = fs.readFileSync(path.join(root, 'worker.py'), 'utf8');
    for (const name of [
        'wangp_generate',
        'wangp_get_job',
        'wangp_cancel_job',
        'wangp_get_model_availability',
        'wangp_create_gallery_download',
    ]) {
        assert.match(worker, new RegExp(name));
    }
    assert.match(worker, /Bearer \{SESSION_TOKEN\}/);
    assert.match(worker, /Wan-AI\/Wan2\.1-T2V-1\.3B-Diffusers/);
});

