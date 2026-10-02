"""Regressioni per la generazione UTF-8 e la verifica senza scritture."""
import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CurriculumGenerationTest(unittest.TestCase):
    def test_import_does_not_rewrite_catalogue(self):
        target = ROOT / 'app/src/main/assets/web/curriculum.js'
        before = target.read_bytes()
        spec = importlib.util.spec_from_file_location('curriculum', ROOT / 'tools/make_curriculum.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.assertEqual(target.read_bytes(), before)
        self.assertEqual(len(module.EXERCISES), 70)

    def test_generation_uses_utf8_with_legacy_windows_encoding(self):
        import sys
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'tools').mkdir()
            (root / 'app/src/main/assets/web').mkdir(parents=True)
            script = root / 'tools/make_curriculum.py'
            shutil.copyfile(ROOT / 'tools/make_curriculum.py', script)
            env = {**os.environ, 'PYTHONUTF8': '0', 'PYTHONIOENCODING': 'cp1252'}
            subprocess.run([sys.executable, '-X', 'utf8=0', str(script)], env=env, check=True, capture_output=True)
            generated = (root / 'app/src/main/assets/web/curriculum.js').read_bytes()
            self.assertEqual(generated.decode('utf-8'), (ROOT / 'app/src/main/assets/web/curriculum.js').read_text(encoding='utf-8'))
            self.assertIn('export const EXERCISES', generated.decode('utf-8'))


if __name__ == '__main__':
    unittest.main()
