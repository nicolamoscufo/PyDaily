"""Piccoli pesi sintetici per testare il loader: non sono un modello didattico."""
import argparse
from pathlib import Path
import struct

import numpy as np

def write_fixture(path, moe_step, experts=0):
    layers = 4 if experts else 2
    tokens = ["<unk>", "<s>", "</s>"] + [chr(97+i) for i in range(29)]
    tokens += list(' "\\:,[]0123456789-+.*()%_=<>\n\t\r')
    metadata = {
        "general.architecture": "llama4", "general.name": "PyDaily synthetic dense loader test",
        "llama4.context_length": 256, "llama4.embedding_length": 8, "llama4.block_count": layers,
        "llama4.feed_forward_length": 12, "llama4.attention.head_count": 2, "llama4.attention.head_count_kv": 1,
        "llama4.rope.dimension_count": 4, "llama4.rope.freq_base": 8000000.0,
        "llama4.attention.layer_norm_rms_epsilon": 1e-5, "llama4.expert_count": experts, "llama4.expert_used_count": 1 if experts else 0,
        "llama4.expert_feed_forward_length": 12, "llama4.interleave_moe_layer_step": moe_step,
        "llama4.attention.sliding_window": 0, "tokenizer.ggml.model": "llama",
        "tokenizer.ggml.tokens": tokens,
        "tokenizer.ggml.scores": [0.0] * len(tokens), "tokenizer.ggml.token_type": [2, 3, 3] + [1] * (len(tokens)-3),
        "tokenizer.ggml.unknown_token_id": 0, "tokenizer.ggml.bos_token_id": 1, "tokenizer.ggml.eos_token_id": 2,
    }
    if experts:
        del metadata["llama4.attention.sliding_window"]
    tensors = {}
    rng = np.random.default_rng(42)
    def tensor(name, shape):
        tensors[name] = rng.normal(0, 0.1, shape).astype("<f4")
    tensor("token_embd.weight", (len(tokens), 8))
    tensors["output_norm.weight"] = np.ones(8, dtype="<f4")
    for layer in range(layers):
        for name in ("attn_norm", "ffn_norm"):
            tensors[f"blk.{layer}.{name}.weight"] = np.ones(8, dtype="<f4")
        for name, shape in (("attn_q", (8,8)), ("attn_k", (4,8)), ("attn_v", (4,8)), ("attn_output", (8,8))):
            tensor(f"blk.{layer}.{name}.weight", shape)
        if experts and (layer + 1) % moe_step == 0:
            for name, shape in (("ffn_gate_inp", (experts,8)), ("ffn_gate_exps", (experts,12,8)), ("ffn_up_exps", (experts,12,8)), ("ffn_down_exps", (experts,8,12)), ("ffn_gate_shexp", (12,8)), ("ffn_up_shexp", (12,8)), ("ffn_down_shexp", (8,12))):
                tensor(f"blk.{layer}.{name}.weight", shape)
        else:
            for name, shape in (("ffn_gate", (12,8)), ("ffn_up", (12,8)), ("ffn_down", (8,12))):
                tensor(f"blk.{layer}.{name}.weight", shape)
    # GGUF v3, soli scalari/array e tensori F32, allineamento standard a 32 byte.
    def string(value):
        data = value.encode("utf-8")
        return struct.pack("<Q", len(data)) + data
    def value(item):
        if isinstance(item, str): return struct.pack("<I", 8) + string(item)
        if isinstance(item, float): return struct.pack("<If", 6, item)
        if isinstance(item, int): return struct.pack("<II", 4, item)
        item_type = 8 if isinstance(item[0], str) else 6 if isinstance(item[0], float) else 5
        return struct.pack("<IIQ", 9, item_type, len(item)) + b"".join(value(x)[4:] for x in item)
    header = b"GGUF" + struct.pack("<IQQ", 3, len(tensors), len(metadata))
    header += b"".join(string(key) + value(item) for key, item in metadata.items())
    data = bytearray()
    for name, array in tensors.items():
        header += string(name) + struct.pack("<I", array.ndim)
        header += struct.pack("<" + "Q" * array.ndim, *reversed(array.shape))
        header += struct.pack("<IQ", 0, len(data))
        data.extend(array.tobytes())
        data.extend(b"\0" * (-len(data) % 32))
    path.write_bytes(header + b"\0" * (-len(header) % 32) + data)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    output = parser.parse_args().directory
    output.mkdir(parents=True, exist_ok=True)
    write_fixture(output / "dense.gguf", 0)
    write_fixture(output / "invalid-moe.gguf", 1)
    write_fixture(output / "moe.gguf", 2, experts=2)
    print("Fixture sintetiche create:", output)
