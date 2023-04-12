/**
 * 区间分割，七天一个数组
 * @param start
 * @param end
 * @returns {*[]}
 */
const formatSpaceDate = (start, end) => {
  let dateArr = [];
  let day = 86400000;
  start = new Date(start).getTime();
  end = new Date(end).getTime();
  let dateSpace = (end - start) / day;
  for (let i = 0, tempArr = []; i <= dateSpace; i++) {
    // 有余数的时候
    if (i === dateSpace && dateSpace.length % 7 !== 0) dateArr.push(tempArr);
    if (tempArr.length === 7) {
      dateArr.push(tempArr);
      tempArr = [];
    }
    tempArr.push(start);
    start += day;
  }
  return dateArr;
};

/**
 * 格式化年月日
 * @param time
 * @returns {string}
 */
function formatDate(time) {
  let date = new Date(time);
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  let strDate = date.getDate();
  return year + "-" + month + "-" + strDate;
}

/**
 * 获取access_token
 * @returns {Promise<any>}
 */
const getAccessToken = async (appKey, appSecret) => {
  const res = await fetch(
    `https://oapi.dingtalk.com/gettoken?appkey=${appKey}&appsecret=${appSecret}`
  );
  const json = await res.json();
  return json;
};

/**
 * 获取打卡记录
 * @param token
 * @param userId
 * @param start
 * @param end
 * @returns {Promise<*|*[]>}
 */
const getAttendance = async (token, userId, start, end) => {
  const res = await fetch(
    "https://oapi.dingtalk.com/attendance/list?access_token=" + token,
    {
      method: "POST",
      body: JSON.stringify({
        workDateFrom: formatDate(start) + " 00:00:00",
        workDateTo: formatDate(end) + " 23:59:59",
        userIdList: [userId],
        offset: 0,
        limit: 50,
      }),
    }
  );
  const json = await res.json();
  return json.recordresult || [];
};

const getOvertimeDuration = async () => {
  let userId = ""; // 钉钉用户id
  const date = formatSpaceDate("2023-01-01", "2023-04-08");// 查询加班日期区间
  const appKey = ""; // 钉钉应用appKey
  const appSecret = "";// 钉钉应用appSecret
  const offDuty = 18.5;// 下班时间
  let { access_token } = await getAccessToken(appKey, appSecret);
  let result = [];

  for (let i = 0; i < date.length; i++) {
    // 接口限制每次最多查询7天
    result.push(
      getAttendance(
        access_token,
        userId,
        date[i][0],
        date[i].length === 1 ? date[i][0] : date[i][date[i].length - 1]
      )
    );
  }
  result = await Promise.all(result).then((r) => {
    return r.flat().reduce((pre, { userCheckTime, checkType }) => {
      if (checkType === "OffDuty") {
        // 过滤下班打卡
        let curDate = new Date(formatDate(userCheckTime)).getTime();
        return pre + (userCheckTime - (curDate + 3600000 * offDuty)) / 60000;
      } else {
        return pre;
      }
    }, 0);
  });
  return Math.ceil(result);
};

getOvertimeDuration().then((r) => {
  let h=Math.ceil(r / 60)
  let d=Math.ceil(h / 8)
  console.log(`今年加班共计${r}分钟,约${h}小时,${d}个工作日`);
});
