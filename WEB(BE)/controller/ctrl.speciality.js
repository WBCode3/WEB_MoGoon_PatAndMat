'use strict';
import { Result } from './ctrl.common.js';
import { db } from '../firebase/db.js';
import { collection, getDocs, doc, updateDoc, query, where, getDoc, addDoc, DocumentReference, increment } from 'firebase/firestore/lite';
import { adminAuth } from '../firebase/admin.js';

const speciality_list = async (req, res) => {
    const result = new Result();
    const refresh_token = req.cookies.refresh_token;
    const id_token = req.cookies.id_token;

    try {
        let user_data = undefined;

        if (id_token !== undefined) {
            const decodedToken = await adminAuth.verifyIdToken(id_token);
            console.log(decodedToken); // TODO : remove later
            const email = decodedToken.email;
            const user_doc = await getDoc(doc(db, "user", email));
            if (user_doc.exists()) {
                user_data = user_doc.data();
                console.log(user_data); // TODO : remove later
            }
        }

        const snapshot = await getDocs(collection(db, 'speciality'));
        const doc_list = snapshot.docs.map((doc) => {
            const doc_data = doc.data();
            doc_data.is_favorite = user_data !== undefined && user_data.favorite_speciality.includes(doc.id);
            return doc_data;
        });

        //console.log(doc_list); // TODO

        result.success = true;
        result.data = doc_list;
    } catch (error) {
        result.success = false;
        result.err_code = error.code;
        result.err_msg = error.message;
    }

    return res.json(result);
}

const speciality_desc = async (req, res) => {
    const result = new Result();

    try {
        const speciality_name = req.params.speciality_name;
        const military_kind = req.params.military_kind;
        const q = query(collection(db, 'speciality'), 
                        where("speciality_name", "==", speciality_name),
                        where("military_kind", "==", military_kind));
        const snapshot = await getDocs(q);
        const doc_list = snapshot.docs.map(doc => doc.data());

        if (doc_list.length == 0) {
            result.success = false;
            result.err_code = "-1";
            result.err_msg = "no speciality, check speciality name";
        }
        else {
            let document = doc_list[0];

            const q = query(collection(db, 'speciality_desc'), 
                            where("speciality_name", "==", speciality_name),
                            where("military_kind", "==", military_kind));

            const snapshot = await getDocs(q);
            const docs = snapshot.docs.map(doc => doc.data());
            const desc_data = docs[0];
            
            for (let i = 0; i < desc_data.contents.length; i++) {
                const now_content = desc_data.contents[i];
                for (let j = 0; j < now_content.content.length; j ++) {
                    const now_data = now_content.content[j];
                    if (now_data instanceof DocumentReference) {
                        const snapshot = await getDoc(now_data);
                        const data = await snapshot.data();
                        desc_data.contents[i].content[j] = data;
                    }
                }
            }

            if (docs.length == 1) {
                Object.assign(document, desc_data);
                result.success = true;
                result.data = document;
            }
            else {
                result.success = false;
                result.err_code = "-1";
                result.err_msg = "no speciality_desc, check speciality name or military_kind";
            }
            
        }
   
    } catch (error) {
        result.success = false;
        result.err_code = error.code;
        result.err_msg = error.message;
        console.log(error);
    }

    return res.json(result);
}

const speciality_like_increase = async (req, res) => {
    // TODO : 특기 즐겨찾기 클릭시 좋아요 개수 증가
    const result = new Result();
    try {
        const speciality_name = req.params.speciality_name;
        const military_kind = req.params.military_kind;
        const is_increase = req.params.is_increase;

        console.log(speciality_name);
        console.log(military_kind);

        const q = query(collection(db, 'speciality'), 
                            where("speciality_name", "==", speciality_name),
                            where("military_kind", "==", military_kind));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            result.success = false;
            result.err_msg = "해당하는 특기가 없습니다. 특기 이름과 군종을 확인하세요.";
        }
        else {
            const docs = snapshot.docs.map(doc => doc.ref);
            const speciality_doc = docs[0];
            if (is_increase === 'increase') {
                updateDoc(speciality_doc, {like: increment(1)});
                result.success = true;
            }
            else if (is_increase === 'decrease') {
                updateDoc(speciality_doc, {like: increment(-1)});
                result.success = true;
            }
            else {
                result.success = false;
                result.err_msg = "API가 잘못되었습니다. like/increase like/decrease 이외의 값이 들어왔습니다.";
            }
        }
    } catch (error) {
        result.success = false;
        result.err_code = error.code;
        result.err_msg = error.message;
    }

    res.json(result);
};

const add = async (req, res) => { // TODO : remove function later
    const result = new Result();

    console.log(req.body);
    try {
        const docRef = await addDoc(collection(db, 'speciality'), req.body);
        result.success = true;
    } catch (error) {
        result.error = error;
    }

    res.json(result);
}

const add_desc = async (req, res) => { // TODO : remove function later
    const result = new Result();

    console.log(req.body); 
    try {
        const docRef = await addDoc(collection(db, 'speciality_desc'), req.body);
        result.success = true;
    } catch (error) {
        result.error = error;
    }

    res.json(result);
}

export const ctrl_speciality = {
    get: {
        speciality_list,
        speciality_desc,
    },
    post: {
        speciality_like_increase,
    },
    add, // TODO : remove
    add_desc, // TODO : remove
};