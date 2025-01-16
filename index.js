const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config(); // dotenv 라이브리를 설치하면 .config함수를 사용할 수 있고, process.env 객체에 .env 파일에 적힌 내용들이 추가됨. .env 파일이 없으면 config()를 실행해도 아무일 안일어남
const { google } = require("googleapis");
const app = express();
const schedule = require("node-schedule");

const TOKEN = process.env.TOKEN;
const CRED = process.env.CRED;
const GCRED = process.env.GCRED;
const bot = new TelegramBot(TOKEN, { polling: true }); // 새로운 메세지가 있는지 주기적으로 알려주는 옵션
//
//  * 금천 시트에서 내 개인 시트로 바꿀 때, '금천' , '개인' 으로 검색해서 나오는 부분 다 변경하기
//  * 클라우드타입에 시크릿 JSON 은 `` 안 넣고, .env JSON은 `` 넣어야함
//
let chat_id_error;
let chat_thread_error;
bot.on("message", async (message) => {
  // 왜 포트 설정을 안 하고 배포해도 작동하는지 정확히는 모르겠지만, 봇에서 메세지를 보내면, 텔레그램 서버로 전송되고, bot.on은 그 데이터를 가져와서 데이터 처리를 하는 방식 같은데, 제미니는 그게 아니라고 하는데 모르겠다..
  // console.log("message: ", message);
  try {
    const chat_id = message.chat.id; // 채팅방 아이디
    console.log("chat_id:", chat_id);
    chat_id_error = chat_id;
    const thread = message.reply_to_message?.message_thread_id;
    chat_thread_error = thread; // 주제, 즉 쓰레드
    switch (chat_id) {
      // case -1002448267848: //내 개인 텔레방 id
      case -1002381375474: //금천 텔레방 id
        // if (thread == 104) {
        //104 104는 내 개인 만픽창
        if (thread == 5) {
          // 5는 금천 만픽창
          const firstLine = message.text.split("\n")[0];

          const auth = new google.auth.GoogleAuth({
            // credentials: JSON.parse(CRED), // 내 개인 시트// CRED가 vscode 상에서는 .env에서  `` 이걸 써줘야하는데, 클라우드타입에서는 ``을 빼고 {} 그냥 json 객체형태로만 넣어주니까 된다...
            credentials: JSON.parse(GCRED), //금천시트
            scopes: "https://www.googleapis.com/auth/spreadsheets",
          });
          const client = await auth.getClient(); // auth를 수행한 뒤 제공되는 객체
          const googleSheets = google.sheets({ version: "v4", auth: client }); // 구글시트 인스턴스

          console.log("만픽창입니다.");
          const regex = /\/신규/;

          if (regex.test(firstLine)) {
            const data = message.text; //수신된 메세지
            ////////////////////////////////
            // const spreadsheetId =
            //   "1ZJRPB7DWaoYaWwGvLbx6g8_9UGtUfIOFbC3ICIlNJEU"; // 내개인
            const spreadsheetId =
              "1eK9A_ZfGRAPfyx2wA-xmLWyMied9qISfA6lcWgrFWtk"; // 금천시트
            const response = await googleSheets.spreadsheets.values.get({
              auth,
              spreadsheetId,
              // range: "시트1!C:C", // 내개인
              range: "섭외자관리!C:C", // 금천시트
            }); //시트 C:C 에서 마지막 행이 몇번째 행인지 찾는 함수
            const values = response.data.values;
            const nextRow = values ? values.length + 1 : 1; // 마지막 행 다음 행을 찾음. 만약 값이 없으면 1행부터 시작
            // 범위 지정
            console.log("nextRow:", nextRow);
            // const range = `시트1!A${nextRow}`; //내 개인
            const range = `섭외자관리!A${nextRow}`; //금천시트
            ////////////////////////////////
            function ParseData(data) {
              const lines = data.split("\n");

              // '만픽'이 처음 등장하는 인덱스 찾기
              const startIdx = lines.indexOf("만픽");
              // '만픽' 이후 '교구찾'이 등장하는 인덱스 찾기
              const endIdx =
                startIdx == -1 // indexOf 로 배열에 '만픽'이 없으면 -1이 뜸. 있으면 해당하는 인덱스가 나오고
                  ? lines.indexOf("교구찾", 1)
                  : lines.indexOf("교구찾", startIdx + 1); // '교구찾'을 찾는데, startIdx + 1 에서 검색을 시작

              const DateRegex = /\d+/g;
              const DateSlicedLines =
                startIdx == -1
                  ? lines.slice(0, endIdx)
                  : lines.slice(0, startIdx); //두번째 인자는 포함하지 않고 자름
              const DateResult = [];

              //날짜 정규식 코드
              DateSlicedLines.forEach((line) => {
                const matches = line.match(DateRegex);
                if (matches) {
                  const Ary = [
                    matches[0], // 월
                    matches[1], // 일
                  ];
                  console.log("어레이", Ary);
                  DateResult.push(Ary);
                }
              });

              console.log("lines :", lines);
              const TeacherIdx = lines.indexOf("교구찾");

              const TeacherSlicedLines =
                TeacherIdx == -1 ? [] : lines.slice(TeacherIdx + 1); //생략하면 배열 끝까지 자름, '교구찾'이 없다면 -1을 반환하여 여기서 모든 배열을 담게 되므로, 예외 처리해야함.
              // 교구찾 없을 때 '교구찾 명단'

              const DateFixRegex = /[\uAC00-\uD7A3]+/g;

              const ExistStartIdx =
                endIdx == -1
                  ? lines.slice(startIdx + 1)
                  : lines.slice(startIdx + 1, endIdx);

              const DateFixedSlicedLines = startIdx == -1 ? [] : ExistStartIdx;

              const DateFixedResult = [];
              const DateFixedNames = [];
              // 교구찾 없을 때 '만픽 명단들'

              // 현재 년도 출력 (예: 2024)
              function getYear() {
                const now = new Date();
                const year = now.getFullYear();
                return year;
              }

              // 신규(만픽) 등록하는 코드
              console.log("함수 내부 nextRow:", nextRow);
              let CurrentRow = nextRow;
              DateFixedSlicedLines.forEach((line) => {
                console.log("line", line);
                const matches = line.match(DateFixRegex);
                if (matches) {
                  let TeacherDate = undefined;
                  DateFixedNames.push(matches[0]); //만픽 명단

                  if (TeacherSlicedLines?.includes(matches[0])) {
                    TeacherDate = `${getYear()}. ${DateResult[0][0]}. ${
                      DateResult[0][1]
                    }`; //만픽+신규 // 교구찾은 일단 지금 안할것
                  }
                  const Ary = [
                    `=iferror(XLOOKUP($D${CurrentRow},'지역명단'!$C:$C,'지역명단'!$A:$A)," ")`,
                    `=iferror(XLOOKUP($D${CurrentRow},'지역명단'!$C:$C,'지역명단'!$B:$B)," ")`,
                    matches[0],
                    matches[1],
                    matches[2],
                    matches[3],
                    matches[4],
                    `${getYear()}. ${DateResult?.[0]?.[0]}. ${
                      DateResult?.[0]?.[1]
                    }`, // 맨 위에 있는 날짜 ex) 11/17 의 월,일을 삽입함 + 현재 년도 함수
                    //TeacherDate, // 교구찾 날짜, 일단 이건 적용 제외해야겠음.
                  ];
                  DateFixedResult.push(Ary);
                  CurrentRow++;
                }
              });

              const PastTeacherResult = TeacherSlicedLines?.filter(
                (item) => !DateFixedNames.includes(item)
              ); // 비신규 교구건, 교구건 명단에서 신규 교구건 데이터는 제외하는 코드
              const result = {
                date: DateResult,
                DateFixedArray: DateFixedResult,
                DateFixNames: DateFixedNames,
                PastTeacherArray: PastTeacherResult,
              };
              console.log("result:", result);
              return result; // 만픽 데이터
            }
            ////////////////////////////////////////////////////////////////
            const ParseResult = ParseData(data); // 정규표현식 처리한 만픽데이터

            const case1 =
              ParseResult.date.length == 1 &&
              typeof Number(ParseResult?.date?.[0]?.[0]) === "number" &&
              typeof Number(ParseResult?.date?.[0]?.[1]) === "number";
            const case2 =
              typeof ParseResult?.DateFixedArray?.[0]?.[2] ===
              ("string" || undefined); // 웬만하면 이거 만족할 듯

            ////////////////////////////////////////////////////////////////
            let OK = true;
            let Message = "등록되지 않았습니다.";

            if (!case1) {
              OK = false;
              Message = "날짜가 잘못되었습니다.";
            } else if (!case2) {
              OK = false;
              Message = "만픽 데이터가 잘못되었습니다.";
            } else if (nextRow == 2) {
              OK = false;
              Message = "첫행에 데이터를 수기로 입력한 후 재시도 하세요.";
            }

            ////////////////////////////////////////////////////////////////

            if (OK) {
              await googleSheets.spreadsheets.values.append({
                auth,
                spreadsheetId,
                range: range,
                valueInputOption: "USER_ENTERED",
                insertDataOption: "INSERT_ROWS",
                resource: {
                  values: ParseResult.DateFixedArray,
                },
              });
              // return result response 객체를 나타내는 것 같은데, 리턴할 필요없음
              // 첫행에 데이터 없는 경우

              await bot.sendMessage(
                chat_id,
                `"${ParseResult.DateFixNames}"\n\n 신규 만픽 ${ParseResult.DateFixNames.length}건이 등록되었습니다.\n\n 교구건은 직접 날짜를 입력해주세요!🙏`,
                {
                  ////////////////////////////////////////////////////////////////

                  message_thread_id: thread,
                }
              );
            } else {
              await bot.sendMessage(chat_id, Message, {
                ////////////////////////////////////////////////////////////////

                message_thread_id: thread,
              });
            }
          } else {
            await bot.sendMessage(
              chat_id,
              "첫째줄에는 /신규 만 작성해주세요.",
              {
                ////////////////////////////////////////////////////////////////

                message_thread_id: thread,
              }
            );
          }
          // } else if (thread == 107) {
          //107은 내 개인 일일창
        } else if (thread == 12) {
          // 12는 금천 일일창
          const firstLine = message.text.split("\n")[0];

          const auth = new google.auth.GoogleAuth({
            //credentials: JSON.parse(CRED), // 내 개인 시트// CRED가 vscode 상에서는 .env에서  `` 이걸 써줘야하는데, 클라우드타입에서는 ``을 빼고 {} 그냥 json 객체형태로만 넣어주니까 된다...
            credentials: JSON.parse(GCRED),
            scopes: "https://www.googleapis.com/auth/spreadsheets",
          });
          const client = await auth.getClient(); // auth를 수행한 뒤 제공되는 객체
          const googleSheets = google.sheets({ version: "v4", auth: client }); // 구글시트 인스턴스

          console.log("일일창입니다.");
          const regexday = /\/일일/;

          if (regexday.test(firstLine)) {
            const data = message.text;
            console.log("data:", data);
            // const spreadsheetId =
            //   "1A24Sgr4RkHpHW73y_WTZQO-A1kve_6ldnZhiEh3pk1I"; // 내 개인 일일 활동자 창
            const spreadsheetId =
              "1NPudEATYzqdZoeotsqXvc67xX-FyJBx0xAAC4BPnRIE"; // 금천 계정 일일 활동자 창
            const response = await googleSheets.spreadsheets.values.get({
              auth,
              spreadsheetId,
              range: "활동자!C:C", // 내개인
            }); //시트 C:C 에서 마지막 행이 몇번째 행인지 찾는 함수
            const values = response.data.values;
            const nextRow = values ? values.length + 1 : 1; // 마지막 행 다음 행을 찾음. 만약 값이 없으면 1행부터 시작
            // 범위 지정
            console.log("nextRow:", nextRow);
            const range = `활동자!A${nextRow}`; //내 개인

            ////////////////////////////////////////////////////////////////////////
            function ParseDataDay(data) {
              const lines = data.split("\n");
              //찾기활동자수가 처음 등장하는 인덱스 찾기

              const regex = /\(.*\)/;
              const DateResult = [];
              lines.forEach((line) => {
                const matches = line.match(regex);

                if (matches) {
                  DateResult.push(matches[0]);
                }
              });
              const DateSliced = DateResult[0];
              console.log("DateSliced:", DateSliced);
              const regexDate = /(\d+)/g; // 숫자 하나 이상을 의미하는 정규 표현식
              const matches = DateSliced.match(regexDate);
              const DateParse = [
                matches[1], // 월
                matches[2], // 일
              ];
              function getYear() {
                const now = new Date();
                const year = now.getFullYear();
                return year;
              }
              console.log("DateParse:", DateParse); // ["41", "11", "26"]
              const PlayDate = `${getYear()}. ${DateParse?.[0]}. ${
                DateParse?.[1]
              }`;

              const regexSearch = /.*찾기활동자수.*/;
              const regexSearch2 = /.*성따\/복등.*/;
              let PlayStartIdx;
              let PlayEndIdx;

              lines.forEach((line, index) => {
                console.log("line:", line);
                const matches = line.match(regexSearch);
                const matches2 = line.match(regexSearch2);

                if (matches) {
                  PlayStartIdx = index;
                } else if (matches2) {
                  PlayEndIdx = index;
                }
              });
              console.log("시작 끝", PlayStartIdx, PlayEndIdx);
              const PrevSlicedPlay = lines.slice(PlayStartIdx + 1, PlayEndIdx);
              console.log("PrevSlicedPlay:", PrevSlicedPlay);
              const SlicedPlay = PrevSlicedPlay.filter((item) => item !== "");
              console.log("SlicedPlay:", SlicedPlay);

              const PlayNumAry = [];

              // SlicedPlay: [
              //   '1/3(테스트 테스트 테스트)',
              //   '2/',
              //   '3/1(테스트)',
              //   '4/2(테스트 테스트)',
              //   '5/',
              //   '6/',
              //   '7/'
              // ]

              SlicedPlay.forEach((line) => {
                const [firstNum, secondNumStr] = line.split("/");
                const secondNum = isNaN(parseInt(secondNumStr))
                  ? 0
                  : parseInt(secondNumStr); // 문자열을 숫자로 변환
                // firstNum: 1, secondNum: 2 , 1구역의 활동자수 2명 이런식으로..
                console.log(
                  "firstNum, secondNum, PlayDate:",
                  PlayDate,
                  firstNum,
                  secondNum
                );
                PlayNum = [PlayDate, parseInt(firstNum), secondNum];
                PlayNumAry.push(PlayNum);
              });
              console.log("PlayNumAry:", PlayNumAry);

              let ResultMessage = "";
              PlayNumAry.forEach((item) => {
                Msg = `${item[1]}구역 : ${item[2]}명\n`;
                ResultMessage += Msg;
                console.log("ResultMessage:", ResultMessage);
              });

              const result = {
                PlayNumAry,
                PlayDate,
                ResultMessage,
              };
              console.log("result:", result);
              return result; // 일일 데이터
            }
            ////////////////////////////////
            const ParseResult = ParseDataDay(data);

            const case1 = typeof Number(ParseResult?.PlayDate) === "number";
            const case2 = typeof ParseResult?.PlayNumAry[0][1] === "number"; // 웬만하면 이거 만족할 듯

            ////////////////////////////////////////////////////////////////
            let OK = true;
            let Message = "등록되지 않았습니다.";

            if (!case1) {
              OK = false;
              Message = "날짜가 잘못되었습니다.";
            } else if (!case2) {
              OK = false;
              Message = "구역과 활동자수가 잘못되었습니다.";
            } else if (nextRow == 2) {
              OK = false;
              Message = "첫행에 데이터를 수기로 입력한 후 재시도 하세요.";
            }

            if (OK) {
              await googleSheets.spreadsheets.values.append({
                auth,
                spreadsheetId,
                range: range,
                valueInputOption: "USER_ENTERED",
                insertDataOption: "INSERT_ROWS",
                resource: {
                  values: ParseResult.PlayNumAry,
                },
              });
              // return result response 객체를 나타내는 것 같은데, 리턴할 필요없음
              // 첫행에 데이터 없는 경우

              await bot.sendMessage(
                chat_id,
                `${ParseResult.PlayDate} 일자\n\n${ParseResult.ResultMessage}\n일일활동자 수가 등록되었습니다!🙏`,
                {
                  ////////////////////////////////////////////////////////////////

                  message_thread_id: thread,
                }
              );
            } else {
              await bot.sendMessage(chat_id, Message, {
                ////////////////////////////////////////////////////////////////

                message_thread_id: thread,
              });
            }
          } else {
            await bot.sendMessage(
              chat_id,
              "첫째줄에는 /일일 만 작성해주세요.",
              {
                ////////////////////////////////////////////////////////////////

                message_thread_id: thread,
              }
            );
          }
        }
        break;
    }
  } catch (error) {
    console.log("에러 발생함");

    bot.sendMessage(
      chat_id_error,
      `${error} // "에러, 데이터를 확인해주세요."`,
      {
        message_thread_id: chat_thread_error,
      }
    );
  }
});
//KST = UTC + 9시간
// 박 기범, [2025-01-11(토) 오전 2:59]
// 1팀일보창 채팅아이디: -1002056368988

// 박 기범, [2025-01-11(토) 오전 3:00]
// 2팀일보창 채팅아이디: -1001605704969
const job11 = schedule.scheduleJob("0 24 * * *", () => {
  bot.sendMessage(-1002448267848, "더 올리실 내용 있으실까요?");
});

const job12 = schedule.scheduleJob("30 24 * * *", () => {
  bot.sendMessage(-1002448267848, "마감하겠습니다.");
});

const job13 = schedule.scheduleJob("20 14 * * *", () => {
  bot.sendMessage(-1002448267848, "일일보고 마감 10분 전 입니다");
});

schedule.scheduleJob("0 0 * * *", () => {
  bot.sendMessage(-1002448267848, "0");
});
schedule.scheduleJob("0 1 * * *", () => {
  bot.sendMessage(-1002448267848, "1");
});
schedule.scheduleJob("0 2 * * *", () => {
  bot.sendMessage(-1002448267848, "2");
});
schedule.scheduleJob("0 3 * * *", () => {
  bot.sendMessage(-1002448267848, "3");
});
schedule.scheduleJob("0 4 * * *", () => {
  bot.sendMessage(-1002448267848, "4");
});
schedule.scheduleJob("0 5 * * *", () => {
  bot.sendMessage(-1002448267848, "5");
});
schedule.scheduleJob("0 6 * * *", () => {
  bot.sendMessage(-1002448267848, "6");
});
schedule.scheduleJob("0 7 * * *", () => {
  bot.sendMessage(-1002448267848, "7");
});
schedule.scheduleJob("0 8 * * *", () => {
  bot.sendMessage(-1002448267848, "8");
});
schedule.scheduleJob("0 9 * * *", () => {
  bot.sendMessage(-1002448267848, "9");
});
schedule.scheduleJob("0 10 * * *", () => {
  bot.sendMessage(-1002448267848, "10");
});
schedule.scheduleJob("0 11 * * *", () => {
  bot.sendMessage(-1002448267848, "11");
});

schedule.scheduleJob("0 12 * * *", () => {
  bot.sendMessage(-1002448267848, "12");
});

schedule.scheduleJob("0 13 * * *", () => {
  bot.sendMessage(-1002448267848, "13");
});

schedule.scheduleJob("0 14 * * *", () => {
  bot.sendMessage(-1002448267848, "14");
});

schedule.scheduleJob("0 15 * * *", () => {
  bot.sendMessage(-1002448267848, "15");
});

schedule.scheduleJob("0 16 * * *", () => {
  bot.sendMessage(-1002448267848, "16");
});

schedule.scheduleJob("0 17 * * *", () => {
  bot.sendMessage(-1002448267848, "17");
});

schedule.scheduleJob("0 18 * * *", () => {
  bot.sendMessage(-1002448267848, "18");
});

schedule.scheduleJob("0 19 * * *", () => {
  bot.sendMessage(-1002448267848, "19");
});

schedule.scheduleJob("0 20 * * *", () => {
  bot.sendMessage(-1002448267848, "20");
});

schedule.scheduleJob("0 21 * * *", () => {
  bot.sendMessage(-1002448267848, "21");
});

schedule.scheduleJob("0 22 * * *", () => {
  bot.sendMessage(-1002448267848, "22");
});

schedule.scheduleJob("0 23 * * *", () => {
  bot.sendMessage(-1002448267848, "23");
});

schedule.scheduleJob("0 24 * * *", () => {
  bot.sendMessage(-1002448267848, "24");
});

schedule.scheduleJob("0 25 * * *", () => {
  bot.sendMessage(-1002448267848, "25");
});

schedule.scheduleJob("0 26 * * *", () => {
  bot.sendMessage(-1002448267848, "26");
});

schedule.scheduleJob("0 27 * * *", () => {
  bot.sendMessage(-1002448267848, "27");
});

schedule.scheduleJob("0 28 * * *", () => {
  bot.sendMessage(-1002448267848, "28");
});

schedule.scheduleJob("0 29 * * *", () => {
  bot.sendMessage(-1002448267848, "29");
});

schedule.scheduleJob("0 30 * * *", () => {
  bot.sendMessage(-1002448267848, "30");
});

schedule.scheduleJob("0 0 * * *", () => {
  bot.sendMessage(-1002448267848, "test");
});
schedule.scheduleJob("0 0 * * *", () => {
  bot.sendMessage(-1002448267848, "test");
});
schedule.scheduleJob("0 0 * * *", () => {
  bot.sendMessage(-1002448267848, "test");
});
schedule.scheduleJob("0 0 * * *", () => {
  bot.sendMessage(-1002448267848, "test");
});
schedule.scheduleJob("0 0 * * *", () => {
  bot.sendMessage(-1002448267848, "test");
});
schedule.scheduleJob("0 0 * * *", () => {
  bot.sendMessage(-1002448267848, "test");
});
schedule.scheduleJob("0 0 * * *", () => {
  bot.sendMessage(-1002448267848, "test");
});

// const job21 = schedule.scheduleJob("0 9 * * *", () => {
//   bot.sendMessage(-1001605704969, "더 올리실 내용 있으실까요?");
// });

// const job22 = schedule.scheduleJob("30 9 * * *", () => {
//   bot.sendMessage(-1001605704969, "마감하겠습니다.");
// });

// const job23 = schedule.scheduleJob("20 23 * * *", () => {
//    bot.sendMessage(-1001605704969, "일일보고 마감 10분 전 입니다");
// });

// app.listen(1337, (req, res) => console.log("listening on 1337"));
