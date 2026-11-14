#!/bin/bash
# Tests for phone transfers (QR links) against a RUNNING server.
# Usage: tests/transfer.test.sh <port> [storage-root]
# Start the server first, pointed at a throwaway database such as drivex_test.
# Never run this against your real database: it creates users and files.
B=http://localhost:$1/api; T=$(mktemp -d); pass=0; fail=0
chk(){ if [ "$2" = "$3" ]; then echo "PASS $1"; pass=$((pass+1)); else echo "FAIL $1 (got '$2', want '$3')"; fail=$((fail+1)); fi; }
j(){ node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log($1)})"; }
H='Content-Type: application/json'; code(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }
# runs a request N times at once and prints one status code per line
burst(){ n=$1; shift; mkdir -p $T/burst; rm -f $T/burst/*; for i in $(seq $n); do (code "$@" > $T/burst/$i; echo >> $T/burst/$i) & done; wait; cat $T/burst/*; }
curl -s -XPOST $B/auth/register -H "$H" -d '{"email":"a@x.com","password":"secret1"}' -o /dev/null
curl -s -XPOST $B/auth/register -H "$H" -d '{"email":"b@x.com","password":"secret2"}' -o /dev/null
A=$(curl -s -XPOST $B/auth/login -H "$H" -d '{"email":"a@x.com","password":"secret1"}' | j o.token)
BOB=$(curl -s -XPOST $B/auth/login -H "$H" -d '{"email":"b@x.com","password":"secret2"}' | j o.token)
head -c 3500000 /dev/urandom > $T/photo.jpg; head -c 25000000 /dev/urandom > $T/big.bin
new(){ curl -s -XPOST $B/transfers -H "Authorization: Bearer $A" -H "$H" -d "$1" | j o.token; }

echo "-- phone -> laptop"
chk "create requires login" "$(code -XPOST $B/transfers -H "$H" -d '{"direction":"receive"}')" 401
chk "bad direction 400" "$(code -XPOST $B/transfers -H "Authorization: Bearer $A" -H "$H" -d '{"direction":"x"}')" 400
TK=$(new '{"direction":"receive"}')
chk "token is 64 hex chars" "$(echo -n $TK | grep -cE '^[a-f0-9]{64}$')" 1
chk "info is public, shows direction" "$(curl -s $B/transfers/public/$TK | j o.direction)" receive
chk "info hides the full email" "$(curl -s $B/transfers/public/$TK | j o.owner)" a
chk "status: waiting" "$(curl -s $B/transfers/$TK/status -H "Authorization: Bearer $A" | j o.status)" waiting
chk "other user can't see status" "$(code $B/transfers/$TK/status -H "Authorization: Bearer $BOB")" 404
chk "over 20MB rejected (413)" "$(code -F "file=@$T/big.bin" $B/transfers/public/$TK/upload)" 413
chk "link survives a rejected upload" "$(curl -s $B/transfers/public/$TK | j o.direction)" receive
chk "no file: 400" "$(code -XPOST $B/transfers/public/$TK/upload)" 400
chk "upload with the token: 201" "$(code -F "file=@$T/photo.jpg" $B/transfers/public/$TK/upload)" 201
chk "status: done + file name" "$(curl -s $B/transfers/$TK/status -H "Authorization: Bearer $A" | j 'o.status+" "+o.receivedFile.name')" "done photo.jpg"
chk "second use is refused" "$(code -F "file=@$T/photo.jpg" $B/transfers/public/$TK/upload)" 404
chk "used link info is refused" "$(code $B/transfers/public/$TK)" 404
FID=$(curl -s $B/files -H "Authorization: Bearer $A" | j 'o[0].id')
chk "file is in the OWNER's list (4 chunks)" "$(curl -s $B/files -H "Authorization: Bearer $A" | j 'o[0].name+" "+o[0].chunkCount')" "photo.jpg 4"
chk "file is NOT in another user's list" "$(curl -s $B/files -H "Authorization: Bearer $BOB" | j o.length)" 0
curl -s $B/files/$FID/download -H "Authorization: Bearer $A" -o $T/back.jpg; cmp -s $T/photo.jpg $T/back.jpg; chk "stored file is byte-identical" $? 0

echo "-- attacks on the public routes"
chk "garbage token" "$(code $B/transfers/public/not-a-token)" 404
chk "unknown valid-looking token" "$(code $B/transfers/public/$(printf 'a%.0s' $(seq 64)))" 404
chk "injection attempt in token" "$(code "$B/transfers/public/%7B%22%24ne%22%3Anull%7D")" 404
T2=$(new '{"direction":"receive"}')
chk "a receive link can't download" "$(code $B/transfers/public/$T2/download)" 404
T3=$(new '{"direction":"receive"}'); code -XDELETE $B/transfers/$T3 -H "Authorization: Bearer $A" >/dev/null
chk "cancelled link is refused" "$(code -F "file=@$T/photo.jpg" $B/transfers/public/$T3/upload)" 404
chk "same message for every bad token" "$( (curl -s $B/transfers/public/zzz; echo; curl -s $B/transfers/public/$TK; echo) | grep -v '^$' | sort -u | wc -l | tr -d ' ')" 1

echo "-- laptop -> phone"
BODY="{\"direction\":\"send\",\"fileId\":\"$FID\"}"
chk "owner can create a send link (proves the body is valid)" "$(code -XPOST $B/transfers -H "Authorization: Bearer $A" -H "$H" -d "$BODY")" 201
chk "can't send another user's file" "$(code -XPOST $B/transfers -H "Authorization: Bearer $BOB" -H "$H" -d "$BODY")" 404
ST=$(new "{\"direction\":\"send\",\"fileId\":\"$FID\"}")
chk "info shows the file" "$(curl -s $B/transfers/public/$ST | j o.file.name)" photo.jpg
chk "a send link can't upload" "$(code -F "file=@$T/photo.jpg" $B/transfers/public/$ST/upload)" 404
curl -s $B/transfers/public/$ST/download -o $T/phone.jpg -w '' ; cmp -s $T/photo.jpg $T/phone.jpg; chk "phone download is byte-identical" $? 0
chk "send link is single-use" "$(code $B/transfers/public/$ST/download)" 404
chk "activity records both directions" "$(curl -s $B/activity -H "Authorization: Bearer $A" | j 'o.some(a=>a.action=="TRANSFER_IN")&&o.some(a=>a.action=="TRANSFER_OUT")')" true

echo "-- races: five phones, one link"
RT=$(new '{"direction":"receive"}')
R=$(burst 5 -F "file=@$T/photo.jpg" $B/transfers/public/$RT/upload)
chk "upload: exactly one wins" "$(echo "$R" | grep -c 201)" 1
chk "upload: the other four are refused" "$(echo "$R" | grep -c 404)" 4
chk "upload: no duplicate stored" "$(curl -s $B/files -H "Authorization: Bearer $A" | j 'o.filter(f=>f.name=="photo.jpg").length')" 2
S2=$(new "{\"direction\":\"send\",\"fileId\":\"$FID\"}")
D=$(burst 5 $B/transfers/public/$S2/download)
chk "download: exactly one wins" "$(echo "$D" | grep -c 200)" 1
chk "download: the other four are refused" "$(echo "$D" | grep -c 404)" 4
[ -n "$2" ] && chk "temp folder left clean" "$(ls "$2/tmp" 2>/dev/null | wc -l | tr -d ' ')" 0
echo "RESULT: $pass passed, $fail failed"; rm -rf $T
