const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config(); // dotenv 라이브리를 설치하면 .config함수를 사용할 수 있고, process.env 객체에 .env 파일에 적힌 내용들이 추가됨. .env 파일이 없으면 config()를 실행해도 아무일 안일어남
const { google } = require("googleapis");
const app = express();
const TOKEN = process.env.TOKEN;
const CRED = process.env.CRED;
const bot = new TelegramBot(TOKEN, { polling: true }); // 새로운 메세지가 있는지 주기적으로 알려주는 옵션

//
let chat_id_error;
bot.on("message", async (message) => {
  console.log("TOKEN", TOKEN);
  console.log("CRED", JSON.parse(CRED));
  console.log("message", message);
  try {
    try {
    } catch (error) {}
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(CRED),
      scopes: "https://www.googleapis.com/auth/spreadsheets",
    });
    const client = await auth.getClient(); // auth를 수행한 뒤 제공되는 객체
    const googleSheets = google.sheets({ version: "v4", auth: client }); // 구글시트 인스턴스
    const spreadsheetId = "1ZJRPB7DWaoYaWwGvLbx6g8_9UGtUfIOFbC3ICIlNJEU"; // 내개인
    // const spreadsheetId = "1eK9A_ZfGRAPfyx2wA-xmLWyMied9qISfA6lcWgrFWtk"; // 금천시트

    console.log(message.reply_to_message?.message_thread_id);
    const chat_id = message.chat.id; // 채팅방 아이디
    chat_id_error = chat_id; // 에러를 대비해 채팅방 아이디 기억
    const topic = message.reply_to_message?.message_thread_id; // 주제, 즉 쓰레드
    const regex = /\/신규/;
    const firstLine = message.text.split("\n")[0];
    switch (topic) {
      case 104:
        console.log("만픽창입니다.");

        if (regex.test(firstLine)) {
          const data = message.text; //수신된 메세지
          ////////////////////////////////
          const response = await googleSheets.spreadsheets.values.get({
            auth,
            spreadsheetId,
            range: "시트1!C:C", // 내개인
            // range: "섭외자관리!C:C", // 금천시트
          }); //시트 C:C 에서 마지막 행이 몇번째 행인지 찾는 함수
          const values = response.data.values;
          let nextRow = values ? values.length + 1 : 1; // 마지막 행 다음 행을 찾음. 만약 값이 없으면 1행부터 시작
          // 범위 지정
          console.log("nextRow:", nextRow);
          const range = `시트1!A${nextRow}`; //내 개인
          // const range = `섭외자관리!A${nextRow}`; //금천시트
          ////////////////////////////////
          function parseData(data) {
            const lines = data.split("\n");

            // '만픽'이 처음 등장하는 인덱스 찾기
            const startIdx = lines.indexOf("만픽");
            // '만픽' 이후 '교구찾'이 등장하는 인덱스 찾기
            const endIdx =
              startIdx == -1
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

          const ParseResult = parseData(data); // 정규표현식 처리한 만픽데이터

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

                message_thread_id: 104,
              }
            );
          } else {
            await bot.sendMessage(chat_id, Message, {
              ////////////////////////////////////////////////////////////////

              message_thread_id: 104,
            });
          }
        } else {
          await bot.sendMessage(chat_id, "첫째줄에는 /신규 만 작성해주세요.", {
            ////////////////////////////////////////////////////////////////

            message_thread_id: 104,
          });
        }
        break;
    }
  } catch (error) {
    console.log("에러 발생함");

    bot.sendMessage(
      chat_id_error,
      `${error} // "에러, 데이터를 확인해주세요."`,
      {
        ////////////////////////////////////////////////////////////////

        message_thread_id: 104,
      }
    );
  }
});

// app.listen(1337, (req, res) => console.log("listening on 1337"));
