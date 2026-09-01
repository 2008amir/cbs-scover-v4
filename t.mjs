import { Client } from "@gradio/client";
import fs from "fs";
const c = await Client.connect("Plachta/Seed-VC", { hf_token: process.env.HF_TOKEN });
console.log("connected");
const r = await c.predict("/predict", {
  source_audio_path: new Blob([fs.readFileSync("/tmp/vc/source.wav")], {type:"audio/wav"}),
  target_audio_path: new Blob([fs.readFileSync("/tmp/vc/reference.wav")], {type:"audio/wav"}),
  diffusion_steps: 30, length_adjust: 1, intelligebility_cfg_rate: 0,
  similarity_cfg_rate: 0.7, top_p: 0.9, temperature: 1, repetition_penalty: 1,
  convert_style: false, anonymization_only: false
});
console.log(JSON.stringify(r.data).slice(0,600));
