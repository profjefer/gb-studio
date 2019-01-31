const { dirDec, hi, lo } = require("./helpers");

const CMD_LOOKUP = {
  END: 0x00, // done
  TEXT: 0x01, // - done
  script_cmd_goto: 0x02,
  IF_FLAG: 0x03,
  script_cmd_unless_flag: 0x04,
  SET_FLAG: 0x05,
  CLEAR_FLAG: 0x06,
  ACTOR_SET_DIRECTION: 0x07,
  ACTOR_SET_ACTIVE: 0x08,
  CAMERA_MOVE_TO: 0x09,
  CAMERA_LOCK: 0x0a,
  WAIT: 0x0b,
  FADE_OUT: 0x0c,
  FADE_IN: 0x0d,
  LOAD_MAP: 0x0e,
  ACTOR_SET_POSITION: 0x0f,
  ACTOR_MOVE_TO: 0x10,
  SHOW_SPRITES: 0x11,
  HIDE_SPRITES: 0x12,
  LOAD_BATTLE: 0x13,
  SHOW_PLAYER: 0x14,
  HIDE_PLAYER: 0x15,
  SET_EMOTION: 0x16,
  CAMERA_SHAKE: 0x17,
  RETURN_TO_TITLE: 0x18
};

const getActorIndex = (actorId, mapId, data) => {
  const map = data.scenes.find(m => m.id === mapId);
  return map.actors.findIndex(a => a.id === actorId) + 1;
};

const precompileEntityScript = (input, output = [], data, mapId) => {
  for (let i = 0; i < input.length; i++) {
    const command = input[i].command;

    if (command === "MOVE_TO") {
      output.push(CMD_LOOKUP[command]);
      output.push(input[i].args.x);
      output.push(input[i].args.y);
      output.push(input[i].args.speed);
    } else if (command === "TEXT") {
      const stringIndex = data.strings.indexOf(input[i].args.text);
      output.push(CMD_LOOKUP[command]);
      // output.push(input[i].args.text);
      output.push(hi(stringIndex));
      output.push(lo(stringIndex));

      let seconds = 200;
      while (seconds > 0) {
        let time = Math.min(seconds, 1000);
        output.push(CMD_LOOKUP["WAIT"]);
        output.push(Math.ceil(60 * (time / 1000)));
        seconds -= time;
      }
    } else if (command === "IF_FLAG") {
      output.push(CMD_LOOKUP["IF_FLAG"]);
      output.push(data.flags.indexOf(input[i].args.flag));
      let ptrIndex = output.length;
      output.push("PTR_PLACEHOLDER1");
      output.push("PTR_PLACEHOLDER2");
      precompileEntityScript(input[i].false, output, data, mapId);
      const truePointer = output.length;
      output[ptrIndex] = truePointer >> 8;
      output[ptrIndex + 1] = truePointer & 0xff;
      precompileEntityScript(input[i].true, output, data, mapId);
    } else if (command === "SET_FLAG") {
      output.push(CMD_LOOKUP[command]);
      output.push(data.flags.indexOf(input[i].args.flag));
    } else if (command === "CLEAR_FLAG") {
      output.push(CMD_LOOKUP[command]);
      output.push(data.flags.indexOf(input[i].args.flag));
    } else if (command === "FADE_IN") {
      output.push(CMD_LOOKUP[command]);
      let speed = input[i].args.speed || 1;
      let speedFlag = (1 << speed) - 1;
      output.push(speed);
    } else if (command === "FADE_OUT") {
      output.push(CMD_LOOKUP[command]);
      let speed = input[i].args.speed || 1;
      let speedFlag = (1 << speed) - 1;
      output.push(speed);
    } else if (command === "CAMERA_MOVE_TO") {
      output.push(CMD_LOOKUP[command]);
      output.push(input[i].args.x);
      output.push(input[i].args.y);
      let speed = input[i].args.speed || 0;
      let speedFlag = ((1 << speed) - 1) | (speed > 0 ? 32 : 0);
      output.push(speedFlag);
    } else if (command === "CAMERA_LOCK") {
      output.push(CMD_LOOKUP[command]);
      let speed = input[i].args.speed || 0;
      let speedFlag = ((1 << speed) - 1) | (speed > 0 ? 32 : 0);
      output.push(speedFlag);
    } else if (command === "LOAD_MAP") {
      let mapIndex = data.scenes.findIndex(m => m.id === input[i].args.map);
      if (mapIndex > -1) {
        output.push(CMD_LOOKUP[command]);
        output.push(mapIndex);
      }
    } else if (command === "LOAD_BATTLE") {
      let encounterIndex = parseInt(input[i].args.encounter, 10);
      if (encounterIndex > -1) {
        output.push(CMD_LOOKUP["LOAD_BATTLE"]);
        output.push(encounterIndex);
      }
    } else if (command === "ACTOR_SET_ACTIVE") {
      output.push(CMD_LOOKUP[command]);
      output.push(input[i].args.index || 0);
    } else if (command === "ACTOR_SET_POSITION") {
      const actorIndex = getActorIndex(input[i].args.actorId, mapId, data);
      output.push(CMD_LOOKUP["ACTOR_SET_ACTIVE"]);
      output.push(actorIndex);
      output.push(CMD_LOOKUP[command]);
      output.push(input[i].args.x || 0);
      output.push(input[i].args.y || 0);
    } else if (command === "ACTOR_SET_DIRECTION") {
      // const map = data.scenes.find(m => m.id === mapId);
      // const actorIndex =
      // map.actors.findIndex(a => a.id === input[i].args.actorId) + 1;
      const actorIndex = getActorIndex(input[i].args.actorId, mapId, data);
      output.push(CMD_LOOKUP["ACTOR_SET_ACTIVE"]);
      output.push(actorIndex);
      output.push(CMD_LOOKUP[command]);
      output.push(dirDec(input[i].args.direction));
    } else if (command === "ACTOR_MOVE_TO") {
      const actorIndex = getActorIndex(input[i].args.actorId, mapId, data);
      output.push(CMD_LOOKUP["ACTOR_SET_ACTIVE"]);
      output.push(actorIndex);
      output.push(CMD_LOOKUP[command]);
      output.push(input[i].args.x || 0);
      output.push(input[i].args.y || 0);

      console.log("MOVE_TO", input[i]);
    } else if (command === "WAIT") {
      let seconds = input[i].args.time || 0;
      while (seconds > 0) {
        let time = Math.min(seconds, 1000);
        output.push(CMD_LOOKUP[command]);
        output.push(Math.ceil(60 * (time / 1000)));
        seconds -= time;
      }
    } else if (command === "CAMERA_SHAKE") {
      let seconds = input[i].args.time || 0;
      while (seconds > 0) {
        let time = Math.min(seconds, 1000);
        output.push(CMD_LOOKUP[command]);
        output.push(Math.ceil(60 * (time / 1000)));
        seconds -= time;
      }
    } else if (command === "SET_EMOTION") {
      const actorIndex = getActorIndex(input[i].args.actorId, mapId, data);
      output.push(CMD_LOOKUP[command]);
      output.push(actorIndex);
      output.push(input[i].args.emotionType || 0);
    } else if (command === "TRANSITION_MAP") {
      let mapIndex = data.scenes.findIndex(m => m.id === input[i].args.map);
      if (mapIndex > -1) {
        output.push(CMD_LOOKUP["LOAD_MAP"]);
        output.push(mapIndex);
        output.push(input[i].args.x || 0);
        output.push(input[i].args.y || 0);
        output.push(dirDec(input[i].args.direction));
        output.push(input[i].args.fadeInSpeed || 2);
      }

      // precompileEntityScript(
      //   [
      //     // {
      //     //   command: "FADE_OUT",
      //     //   args: {
      //     //     speed: input[i].args.fadeOutSpeed
      //     //   }
      //     // },
      //     {
      //       command: "LOAD_MAP",
      //       args: {
      //         map: input[i].args.map,
      //         x: input[i].args.x,
      //         y: input[i].args.y,

      //       }
      //     },
      //     // {
      //     //   command: "ACTOR_SET_ACTIVE",
      //     //   args: {
      //     //     index: 0
      //     //   }
      //     // },
      //     {
      //       command: "ACTOR_SET_POSITION",
      //       args: {
      //         x: input[i].args.x,
      //         y: input[i].args.y
      //       }
      //     },
      //     // {
      //     //   command: "FADE_IN",
      //     //   args: {
      //     //     speed: input[i].args.fadeInSpeed
      //     //   }
      //     // }
      //   ],
      //   output,
      //   data
      // );
    } else if (command === "SHOW_SPRITES") {
      output.push(CMD_LOOKUP[command]);
    } else if (command === "HIDE_SPRITES") {
      output.push(CMD_LOOKUP[command]);
    } else if (command === "SHOW_PLAYER") {
      output.push(CMD_LOOKUP[command]);
    } else if (command === "HIDE_PLAYER") {
      output.push(CMD_LOOKUP[command]);
    } else if (command === "RETURN_TO_TITLE") {
      output.push(CMD_LOOKUP[command]);
    } else if (command === "END") {
    }

    for (var oi = 0; oi < output.length; oi++) {
      if (output[oi] === -1) {
        console.log("OUTPUT FAILED");
        console.log(command);
        console.log(input[i]);
        process.exit();
      }
    }
  }
  output.push(CMD_LOOKUP["END"]);

  return output;
};

module.exports = {
  CMD_LOOKUP,
  precompileEntityScript
};